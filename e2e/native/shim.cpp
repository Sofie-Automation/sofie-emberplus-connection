// Differential-testing shim around Lawo's libember (https://github.com/Lawo/ember-plus).
//
// Exposes a tiny flat C ABI intended to be loaded from Node via `node:ffi`:
// every function takes one NUL-terminated UTF-8 string and returns a malloc'd
// NUL-terminated UTF-8 JSON string of the shape
//   {"ok":true,"value":...} | {"ok":false,"error":"..."}
// which the caller must release with eps_free().
//
// The JSON tree representation implemented here is specified in e2e/CANONICAL.md.

#include <algorithm>
#include <cctype>
#include <cmath>
#include <cstdlib>
#include <cstring>
#include <limits>
#include <memory>
#include <sstream>
#include <stdexcept>
#include <string>
#include <vector>

#include <nlohmann/json.hpp>

#include <ember/ber/ObjectIdentifier.hpp>
#include <ember/ber/Octets.hpp>
#include <ember/dom/DomReader.hpp>
#include <ember/dom/Sequence.hpp>
#include <ember/dom/Set.hpp>
#include <ember/dom/VariantLeaf.hpp>
#include <ember/glow/GlowCommand.hpp>
#include <ember/glow/GlowConnection.hpp>
#include <ember/glow/GlowFunction.hpp>
#include <ember/glow/GlowInvocation.hpp>
#include <ember/glow/GlowInvocationResult.hpp>
#include <ember/glow/GlowLabel.hpp>
#include <ember/glow/GlowMatrix.hpp>
#include <ember/glow/GlowNode.hpp>
#include <ember/glow/GlowNodeFactory.hpp>
#include <ember/glow/GlowQualifiedFunction.hpp>
#include <ember/glow/GlowQualifiedMatrix.hpp>
#include <ember/glow/GlowQualifiedNode.hpp>
#include <ember/glow/GlowQualifiedParameter.hpp>
#include <ember/glow/GlowQualifiedTemplate.hpp>
#include <ember/glow/GlowRootElementCollection.hpp>
#include <ember/glow/GlowSource.hpp>
#include <ember/glow/GlowStreamCollection.hpp>
#include <ember/glow/GlowStreamDescriptor.hpp>
#include <ember/glow/GlowStreamEntry.hpp>
#include <ember/glow/GlowTags.hpp>
#include <ember/glow/GlowTarget.hpp>
#include <ember/glow/GlowTemplate.hpp>
#include <ember/glow/GlowTupleItemDescription.hpp>
#include <ember/glow/util/ValueConverter.hpp>
#include <ember/util/OctetStream.hpp>

#include <s101/StreamDecoder.hpp>
#include <s101/StreamEncoder.hpp>

using json = nlohmann::json;
namespace glow = libember::glow;
namespace dom = libember::dom;
namespace ber = libember::ber;

// ---------------------------------------------------------------------------
// ABI plumbing
// ---------------------------------------------------------------------------

static char* dupString(std::string const& s)
{
	char* out = static_cast<char*>(std::malloc(s.size() + 1));
	if (out == nullptr)
		std::abort();
	std::memcpy(out, s.c_str(), s.size() + 1);
	return out;
}

static char* okResult(json value)
{
	json result;
	result["ok"] = true;
	result["value"] = std::move(value);
	return dupString(result.dump());
}

static char* failResult(std::string const& message)
{
	json result;
	result["ok"] = false;
	result["error"] = message;
	return dupString(result.dump());
}

// ---------------------------------------------------------------------------
// Hex / OID helpers
// ---------------------------------------------------------------------------

static std::vector<unsigned char> fromHex(std::string const& hex)
{
	if (hex.size() % 2 != 0)
		throw std::runtime_error("hex string has odd length");
	std::vector<unsigned char> out;
	out.reserve(hex.size() / 2);
	auto nibble = [](char c) -> unsigned {
		if (c >= '0' && c <= '9')
			return static_cast<unsigned>(c - '0');
		if (c >= 'a' && c <= 'f')
			return static_cast<unsigned>(c - 'a' + 10);
		if (c >= 'A' && c <= 'F')
			return static_cast<unsigned>(c - 'A' + 10);
		throw std::runtime_error("invalid hex character");
	};
	for (std::size_t i = 0; i < hex.size(); i += 2)
		out.push_back(static_cast<unsigned char>((nibble(hex[i]) << 4) | nibble(hex[i + 1])));
	return out;
}

template <typename InputIterator>
static std::string toHex(InputIterator first, InputIterator last)
{
	static char const* digits = "0123456789abcdef";
	std::string out;
	for (; first != last; ++first) {
		unsigned char b = static_cast<unsigned char>(*first);
		out.push_back(digits[b >> 4]);
		out.push_back(digits[b & 0x0f]);
	}
	return out;
}

static std::string oidToString(ber::ObjectIdentifier const& oid)
{
	std::ostringstream out;
	bool firstItem = true;
	for (auto it = oid.begin(); it != oid.end(); ++it) {
		if (!firstItem)
			out << '.';
		out << *it;
		firstItem = false;
	}
	return out.str();
}

static ber::ObjectIdentifier oidFromString(std::string const& text)
{
	std::vector<std::size_t> items;
	if (!text.empty()) {
		std::istringstream in(text);
		std::string part;
		while (std::getline(in, part, '.')) {
			if (part.empty() || part.find_first_not_of("0123456789") != std::string::npos)
				throw std::runtime_error("invalid RELATIVE-OID string: " + text);
			items.push_back(static_cast<std::size_t>(std::stoull(part)));
		}
	}
	return ber::ObjectIdentifier(items.begin(), items.end());
}

// ---------------------------------------------------------------------------
// TypedValue conversion (see CANONICAL.md)
// ---------------------------------------------------------------------------

static json realToJson(double value)
{
	if (std::isnan(value))
		return "NaN";
	if (std::isinf(value))
		return value > 0 ? "Infinity" : "-Infinity";
	// JSON round-trips of -0.0 are unreliable (JSON.stringify(-0) is "0"), so
	// minus zero uses a string sentinel like the non-finite values.
	if (value == 0.0 && std::signbit(value))
		return "-0";
	return value;
}

static double realFromJson(json const& value)
{
	if (value.is_string()) {
		std::string const s = value.get<std::string>();
		if (s == "Infinity")
			return std::numeric_limits<double>::infinity();
		if (s == "-Infinity")
			return -std::numeric_limits<double>::infinity();
		if (s == "NaN")
			return std::numeric_limits<double>::quiet_NaN();
		if (s == "-0")
			return -0.0;
		throw std::runtime_error("invalid real sentinel: " + s);
	}
	return value.get<double>();
}

// NOTE: everything below deliberately avoids glow::Value / glow::MinMax.
// libember's glow::Variant stores "long" values in an int member
// (VariantImpl<long> has `typedef int value_type`), so any integer wider than
// 32 bits is silently truncated by those accessors on LP64 platforms. The
// underlying ber::Value from the DOM is exact, so all value conversion here
// works on raw ber::Value leaves instead.

static long long berValueToInteger(ber::Value const& value)
{
	if (value.typeId() == typeid(int))
		return value.as<int>();
	if (value.typeId() == typeid(long))
		return value.as<long>();
	if (value.typeId() == typeid(long long))
		return value.as<long long>();
	throw std::runtime_error("ber::Value does not hold an integer");
}

static json berValueToJson(ber::Value const& value)
{
	if (!value)
		throw std::runtime_error("empty ber::Value");
	switch (value.universalTag().number()) {
		case ber::Type::Integer:
			return json{ { "type", "integer" }, { "value", berValueToInteger(value) } };
		case ber::Type::Real: {
			double const v =
				value.typeId() == typeid(float) ? value.as<float>() : value.as<double>();
			return json{ { "type", "real" }, { "value", realToJson(v) } };
		}
		case ber::Type::UTF8String:
			return json{ { "type", "string" }, { "value", value.as<std::string>() } };
		case ber::Type::Boolean:
			return json{ { "type", "boolean" }, { "value", value.as<bool>() } };
		case ber::Type::OctetString: {
			ber::Octets const octets = value.as<ber::Octets>();
			return json{ { "type", "octets" }, { "value", toHex(octets.begin(), octets.end()) } };
		}
		case ber::Type::Null:
			return json{ { "type", "null" } };
		default:
			throw std::runtime_error(
				"unsupported ber::Value universal tag " + std::to_string(value.universalTag().number()));
	}
}

static dom::VariantLeaf* berLeafFromJson(ber::Tag const& tag, json const& tv)
{
	std::string const type = tv.at("type").get<std::string>();
	if (type == "integer")
		return new dom::VariantLeaf(tag, static_cast<long>(tv.at("value").get<long long>()));
	if (type == "real")
		return new dom::VariantLeaf(tag, realFromJson(tv.at("value")));
	if (type == "string")
		return new dom::VariantLeaf(tag, tv.at("value").get<std::string>());
	if (type == "boolean")
		return new dom::VariantLeaf(tag, tv.at("value").get<bool>());
	if (type == "octets") {
		std::vector<unsigned char> const bytes = fromHex(tv.at("value").get<std::string>());
		return new dom::VariantLeaf(tag, ber::Octets(bytes.begin(), bytes.end()));
	}
	if (type == "null")
		return new dom::VariantLeaf(tag, ber::Null());
	throw std::runtime_error("unsupported TypedValue type: " + type);
}

// ---------------------------------------------------------------------------
// Raw DOM helpers
// ---------------------------------------------------------------------------

static dom::Node const* findChildByTag(dom::Container const& container, ber::Tag const& tag)
{
	for (auto it = container.begin(); it != container.end(); ++it) {
		if (it->applicationTag() == tag)
			return &*it;
	}
	return nullptr;
}

// Finds a raw property leaf inside an element's contents SET (context tag 1),
// bypassing libember's higher-level accessors (used where those are lossy:
// enumeration/formula string parsing, and the glow::Variant int truncation).
static dom::VariantLeaf const* contentsLeaf(dom::Container const& element, unsigned contextTag)
{
	dom::Node const* contents = findChildByTag(element, ber::make_tag(ber::Class::ContextSpecific, 1));
	dom::Container const* contentsSet = dynamic_cast<dom::Container const*>(contents);
	if (contentsSet == nullptr)
		return nullptr;
	dom::Node const* leaf = findChildByTag(*contentsSet, ber::make_tag(ber::Class::ContextSpecific, contextTag));
	return dynamic_cast<dom::VariantLeaf const*>(leaf);
}

static bool rawContentsString(dom::Container const& element, unsigned contextTag, std::string& out)
{
	dom::VariantLeaf const* variant = contentsLeaf(element, contextTag);
	if (variant == nullptr)
		return false;
	out = glow::util::ValueConverter::valueOf(variant->value(), std::string());
	return true;
}

static bool rawContentsValue(dom::Container const& element, unsigned contextTag, json& out)
{
	dom::VariantLeaf const* variant = contentsLeaf(element, contextTag);
	if (variant == nullptr)
		return false;
	out = berValueToJson(variant->value());
	return true;
}

// Collects the TypedValues of a tagged sequence of value leaves (invocation
// arguments, invocation results) without going through glow::Value.
static bool rawValueSequence(dom::Container const& parent, ber::Tag const& sequenceTag, json& out)
{
	dom::Node const* sequenceNode = findChildByTag(parent, sequenceTag);
	if (sequenceNode == nullptr)
		return false;
	dom::Container const* sequence = dynamic_cast<dom::Container const*>(sequenceNode);
	if (sequence == nullptr)
		return false;
	out = json::array();
	for (auto it = sequence->begin(); it != sequence->end(); ++it) {
		dom::VariantLeaf const* leaf = dynamic_cast<dom::VariantLeaf const*>(&*it);
		if (leaf == nullptr)
			throw std::runtime_error("value sequence contains a non-leaf node");
		out.push_back(berValueToJson(leaf->value()));
	}
	return true;
}

// ---------------------------------------------------------------------------
// Decode: libember DOM -> canonical JSON
// ---------------------------------------------------------------------------

static json elementToJson(dom::Node const& node);

static void addChildren(json& element, glow::GlowElementCollection const* children)
{
	if (children == nullptr)
		return;
	json kids = json::array();
	for (auto it = children->begin(); it != children->end(); ++it)
		kids.push_back(elementToJson(*it));
	if (!kids.empty())
		element["children"] = std::move(kids);
}

static json nodeContentsToJson(glow::GlowNodeBase const& node)
{
	json c;
	c["kind"] = "node";
	if (node.contains(glow::NodeProperty::Identifier))
		c["identifier"] = node.identifier();
	if (node.contains(glow::NodeProperty::Description))
		c["description"] = node.description();
	if (node.contains(glow::NodeProperty::IsRoot))
		c["isRoot"] = node.isRoot();
	if (node.contains(glow::NodeProperty::IsOnline))
		c["isOnline"] = node.isOnline();
	if (node.contains(glow::NodeProperty::SchemaIdentifiers))
		c["schemaIdentifiers"] = node.schemaIdentifiers();
	if (node.contains(glow::NodeProperty::TemplateReference))
		c["templateReference"] = oidToString(node.templateReference());
	return c;
}

static json parameterContentsToJson(glow::GlowParameterBase const& parameter)
{
	json c;
	c["kind"] = "parameter";
	if (parameter.contains(glow::ParameterProperty::Identifier))
		c["identifier"] = parameter.identifier();
	if (parameter.contains(glow::ParameterProperty::Description))
		c["description"] = parameter.description();
	json rawValue;
	if (parameter.contains(glow::ParameterProperty::Value) &&
		rawContentsValue(parameter, glow::ParameterProperty::Value, rawValue))
		c["value"] = rawValue;
	if (parameter.contains(glow::ParameterProperty::Minimum) &&
		rawContentsValue(parameter, glow::ParameterProperty::Minimum, rawValue))
		c["minimum"] = rawValue;
	if (parameter.contains(glow::ParameterProperty::Maximum) &&
		rawContentsValue(parameter, glow::ParameterProperty::Maximum, rawValue))
		c["maximum"] = rawValue;
	if (parameter.contains(glow::ParameterProperty::Access))
		c["access"] = parameter.access().value();
	if (parameter.contains(glow::ParameterProperty::Format))
		c["format"] = parameter.format();
	std::string rawString;
	if (parameter.contains(glow::ParameterProperty::Enumeration) &&
		rawContentsString(parameter, glow::ParameterProperty::Enumeration, rawString))
		c["enumeration"] = rawString;
	if (parameter.contains(glow::ParameterProperty::Factor))
		c["factor"] = parameter.factor();
	if (parameter.contains(glow::ParameterProperty::IsOnline))
		c["isOnline"] = parameter.isOnline();
	if (parameter.contains(glow::ParameterProperty::Formula) &&
		rawContentsString(parameter, glow::ParameterProperty::Formula, rawString))
		c["formula"] = rawString;
	if (parameter.contains(glow::ParameterProperty::Step))
		c["step"] = parameter.step();
	if (parameter.contains(glow::ParameterProperty::Default) &&
		rawContentsValue(parameter, glow::ParameterProperty::Default, rawValue))
		c["default"] = rawValue;
	if (parameter.contains(glow::ParameterProperty::Type))
		c["parameterType"] = parameter.type().value();
	if (parameter.contains(glow::ParameterProperty::StreamIdentifier))
		c["streamIdentifier"] = parameter.streamIdentifier();
	if (parameter.contains(glow::ParameterProperty::EnumMap)) {
		json entries = json::array();
		glow::Enumeration const map = parameter.enumerationMap();
		for (auto it = map.begin(); it != map.end(); ++it)
			entries.push_back(json{ { "name", it->first }, { "value", it->second } });
		c["enumMap"] = std::move(entries);
	}
	if (parameter.contains(glow::ParameterProperty::StreamDescriptor)) {
		glow::GlowStreamDescriptor const* descriptor = parameter.streamDescriptor();
		if (descriptor != nullptr)
			c["streamDescriptor"] = json{ { "format", static_cast<int>(descriptor->format().value()) },
				{ "offset", descriptor->offset() } };
	}
	if (parameter.contains(glow::ParameterProperty::SchemaIdentifiers))
		c["schemaIdentifiers"] = parameter.schemaIdentifiers();
	if (parameter.contains(glow::ParameterProperty::TemplateReference))
		c["templateReference"] = oidToString(parameter.templateReference());
	return c;
}

static json matrixContentsToJson(glow::GlowMatrixBase const& matrix)
{
	json c;
	c["kind"] = "matrix";
	if (matrix.contains(glow::MatrixProperty::Identifier))
		c["identifier"] = matrix.identifier();
	if (matrix.contains(glow::MatrixProperty::Description))
		c["description"] = matrix.description();
	if (matrix.contains(glow::MatrixProperty::Type))
		c["matrixType"] = matrix.type().value();
	if (matrix.contains(glow::MatrixProperty::AddressingMode))
		c["addressingMode"] = matrix.addressingMode().value();
	if (matrix.contains(glow::MatrixProperty::TargetCount))
		c["targetCount"] = matrix.targetCount();
	if (matrix.contains(glow::MatrixProperty::SourceCount))
		c["sourceCount"] = matrix.sourceCount();
	if (matrix.contains(glow::MatrixProperty::MaximumTotalConnects))
		c["maximumTotalConnects"] = matrix.maximumTotalConnects();
	if (matrix.contains(glow::MatrixProperty::MaximumConnectsPerTarget))
		c["maximumConnectsPerTarget"] = matrix.maximumConnectsPerTarget();
	if (matrix.contains(glow::MatrixProperty::ParametersLocation)) {
		glow::ParametersLocation const location = matrix.parametersLocation();
		if (location.kind().value() == glow::ParametersLocationKind::BasePath)
			c["parametersLocation"] = json{ { "basePath", oidToString(location.basePath()) } };
		else
			c["parametersLocation"] = json{ { "inline", location.inlineSubid() } };
	}
	if (matrix.contains(glow::MatrixProperty::GainParameterNumber))
		c["gainParameterNumber"] = matrix.gainParameterNumber();
	if (matrix.contains(glow::MatrixProperty::Labels)) {
		std::vector<glow::GlowLabel const*> labels;
		matrix.typedLabels(std::back_inserter(labels));
		json out = json::array();
		for (glow::GlowLabel const* label : labels)
			out.push_back(json{ { "basePath", oidToString(label->basePath()) }, { "description", label->description() } });
		c["labels"] = std::move(out);
	}
	if (matrix.contains(glow::MatrixProperty::SchemaIdentifiers))
		c["schemaIdentifiers"] = matrix.schemaIdentifiers();
	if (matrix.contains(glow::MatrixProperty::TemplateReference))
		c["templateReference"] = oidToString(matrix.templateReference());

	if (matrix.targets() != nullptr) {
		std::vector<glow::GlowTarget const*> targets;
		matrix.typedTargets(std::back_inserter(targets));
		json out = json::array();
		for (glow::GlowTarget const* target : targets)
			out.push_back(target->number());
		c["targets"] = std::move(out);
	}
	if (matrix.sources() != nullptr) {
		std::vector<glow::GlowSource const*> sources;
		matrix.typedSources(std::back_inserter(sources));
		json out = json::array();
		for (glow::GlowSource const* source : sources)
			out.push_back(source->number());
		c["sources"] = std::move(out);
	}
	if (matrix.connections() != nullptr) {
		std::vector<glow::GlowConnection const*> connections;
		matrix.typedConnections(std::back_inserter(connections));
		json out = json::array();
		for (glow::GlowConnection const* connection : connections) {
			json entry;
			entry["target"] = connection->target();
			ber::ObjectIdentifier const sources = connection->sources();
			if (sources.begin() != sources.end()) {
				json list = json::array();
				for (auto it = sources.begin(); it != sources.end(); ++it)
					list.push_back(static_cast<long long>(*it));
				entry["sources"] = std::move(list);
			}
			if (findChildByTag(*connection, ber::make_tag(ber::Class::ContextSpecific, 2)) != nullptr)
				entry["operation"] = connection->operation().value();
			if (findChildByTag(*connection, ber::make_tag(ber::Class::ContextSpecific, 3)) != nullptr)
				entry["disposition"] = connection->disposition().value();
			out.push_back(std::move(entry));
		}
		c["connections"] = std::move(out);
	}
	return c;
}

static json tupleListToJson(std::vector<glow::GlowTupleItemDescription const*> const& items)
{
	json out = json::array();
	for (glow::GlowTupleItemDescription const* item : items) {
		json entry;
		entry["type"] = item->type().value();
		std::string const name = item->name();
		if (!name.empty())
			entry["name"] = name;
		out.push_back(std::move(entry));
	}
	return out;
}

static json functionContentsToJson(glow::GlowFunctionBase const& function)
{
	json c;
	c["kind"] = "function";
	if (function.contains(glow::FunctionProperty::Identifier))
		c["identifier"] = function.identifier();
	if (function.contains(glow::FunctionProperty::Description))
		c["description"] = function.description();
	if (function.contains(glow::FunctionProperty::Arguments)) {
		std::vector<glow::GlowTupleItemDescription const*> items;
		function.typedArguments(std::back_inserter(items));
		c["args"] = tupleListToJson(items);
	}
	if (function.contains(glow::FunctionProperty::Result)) {
		std::vector<glow::GlowTupleItemDescription const*> items;
		function.typedResult(std::back_inserter(items));
		c["result"] = tupleListToJson(items);
	}
	if (function.contains(glow::FunctionProperty::TemplateReference))
		c["templateReference"] = oidToString(function.templateReference());
	return c;
}

static json invocationToJson(glow::GlowInvocation const& invocation)
{
	json out;
	if (findChildByTag(invocation, ber::make_tag(ber::Class::ContextSpecific, 0)) != nullptr)
		out["id"] = invocation.invocationId();
	json args;
	if (rawValueSequence(invocation, glow::GlowTags::Invocation::Arguments(), args))
		out["args"] = std::move(args);
	return out;
}

static json commandToJson(glow::GlowCommand const& command)
{
	json element;
	element["number"] = command.number().value();
	json c;
	c["kind"] = "command";
	if (findChildByTag(command, ber::make_tag(ber::Class::ContextSpecific, 1)) != nullptr)
		c["dirFieldMask"] = command.dirFieldMask().value();
	glow::GlowInvocation const* invocation = command.invocation();
	if (invocation != nullptr)
		c["invocation"] = invocationToJson(*invocation);
	element["contents"] = std::move(c);
	return element;
}

static json templateContentsToJson(glow::GlowTemplateBase const& tmpl)
{
	json c;
	c["kind"] = "template";
	if (findChildByTag(tmpl, glow::GlowTags::Template::Description()) != nullptr)
		c["description"] = tmpl.description();
	glow::GlowElement const* element = tmpl.element();
	if (element != nullptr)
		c["element"] = elementToJson(*element);
	return c;
}

static json elementToJson(dom::Node const& node)
{
	if (auto const* command = dynamic_cast<glow::GlowCommand const*>(&node))
		return commandToJson(*command);

	json element;
	if (auto const* qnode = dynamic_cast<glow::GlowQualifiedNode const*>(&node)) {
		element["path"] = oidToString(qnode->path());
		element["contents"] = nodeContentsToJson(*qnode);
		addChildren(element, qnode->children());
	} else if (auto const* n = dynamic_cast<glow::GlowNode const*>(&node)) {
		element["number"] = n->number();
		element["contents"] = nodeContentsToJson(*n);
		addChildren(element, n->children());
	} else if (auto const* qparameter = dynamic_cast<glow::GlowQualifiedParameter const*>(&node)) {
		element["path"] = oidToString(qparameter->path());
		element["contents"] = parameterContentsToJson(*qparameter);
		addChildren(element, qparameter->children());
	} else if (auto const* parameter = dynamic_cast<glow::GlowParameter const*>(&node)) {
		element["number"] = parameter->number();
		element["contents"] = parameterContentsToJson(*parameter);
		addChildren(element, parameter->children());
	} else if (auto const* qmatrix = dynamic_cast<glow::GlowQualifiedMatrix const*>(&node)) {
		element["path"] = oidToString(qmatrix->path());
		element["contents"] = matrixContentsToJson(*qmatrix);
		addChildren(element, qmatrix->children());
	} else if (auto const* matrix = dynamic_cast<glow::GlowMatrix const*>(&node)) {
		element["number"] = matrix->number();
		element["contents"] = matrixContentsToJson(*matrix);
		addChildren(element, matrix->children());
	} else if (auto const* qfunction = dynamic_cast<glow::GlowQualifiedFunction const*>(&node)) {
		element["path"] = oidToString(qfunction->path());
		element["contents"] = functionContentsToJson(*qfunction);
		addChildren(element, qfunction->children());
	} else if (auto const* function = dynamic_cast<glow::GlowFunction const*>(&node)) {
		element["number"] = function->number();
		element["contents"] = functionContentsToJson(*function);
		addChildren(element, function->children());
	} else if (auto const* qtemplate = dynamic_cast<glow::GlowQualifiedTemplate const*>(&node)) {
		element["path"] = oidToString(qtemplate->path());
		element["contents"] = templateContentsToJson(*qtemplate);
	} else if (auto const* tmpl = dynamic_cast<glow::GlowTemplate const*>(&node)) {
		element["number"] = tmpl->number();
		element["contents"] = templateContentsToJson(*tmpl);
	} else {
		throw std::runtime_error(
			"unsupported glow element in tree (type tag " + std::to_string(node.typeTag().number()) + ")");
	}
	return element;
}

static json rootToJson(dom::Node const& root)
{
	json out;
	if (auto const* elements = dynamic_cast<glow::GlowRootElementCollection const*>(&root)) {
		out["rootType"] = "elements";
		json list = json::array();
		for (auto it = elements->begin(); it != elements->end(); ++it)
			list.push_back(elementToJson(*it));
		out["elements"] = std::move(list);
	} else if (auto const* streams = dynamic_cast<glow::GlowStreamCollection const*>(&root)) {
		out["rootType"] = "streams";
		json list = json::array();
		for (auto it = streams->begin(); it != streams->end(); ++it) {
			auto const* entry = dynamic_cast<glow::GlowStreamEntry const*>(&*it);
			if (entry == nullptr)
				throw std::runtime_error("unsupported child in stream collection");
			dom::VariantLeaf const* valueLeaf = dynamic_cast<dom::VariantLeaf const*>(
				findChildByTag(*entry, glow::GlowTags::StreamEntry::StreamValue()));
			if (valueLeaf == nullptr)
				throw std::runtime_error("stream entry without value leaf");
			list.push_back(
				json{ { "identifier", entry->streamIdentifier() }, { "value", berValueToJson(valueLeaf->value()) } });
		}
		out["streams"] = std::move(list);
	} else if (auto const* result = dynamic_cast<glow::GlowInvocationResult const*>(&root)) {
		out["rootType"] = "invocationResult";
		json inner;
		inner["id"] = result->invocationId();
		if (findChildByTag(*result, ber::make_tag(ber::Class::ContextSpecific, 1)) != nullptr)
			inner["success"] = result->success();
		json values;
		if (rawValueSequence(*result, glow::GlowTags::InvocationResult::Result(), values))
			inner["result"] = std::move(values);
		out["invocationResult"] = std::move(inner);
	} else {
		throw std::runtime_error("root is not a RootElementCollection, StreamCollection or InvocationResult");
	}
	return out;
}

// ---------------------------------------------------------------------------
// Encode: canonical JSON -> libember DOM
// ---------------------------------------------------------------------------

static glow::GlowElement* buildElement(json const& element);
static glow::GlowElement* buildTemplateElement(json const& element);

static void buildChildrenInto(glow::GlowElementCollection* collection, json const& element)
{
	auto it = element.find("children");
	if (it == element.end())
		return;
	for (json const& child : *it)
		collection->insert(collection->end(), buildElement(child));
}

static void applyNodeContents(glow::GlowNodeBase& node, json const& c)
{
	if (c.contains("identifier"))
		node.setIdentifier(c.at("identifier").get<std::string>());
	if (c.contains("description"))
		node.setDescription(c.at("description").get<std::string>());
	if (c.contains("isRoot"))
		node.setRoot(c.at("isRoot").get<bool>());
	if (c.contains("isOnline"))
		node.setIsOnline(c.at("isOnline").get<bool>());
	if (c.contains("schemaIdentifiers"))
		node.setSchemaIdentifiers(c.at("schemaIdentifiers").get<std::string>());
	if (c.contains("templateReference"))
		node.setTemplateReference(oidFromString(c.at("templateReference").get<std::string>()));
}

static void applyParameterValue(glow::GlowParameterBase& parameter, json const& tv, bool isDefault)
{
	std::string const type = tv.at("type").get<std::string>();
	if (type == "integer") {
		long const v = static_cast<long>(tv.at("value").get<long long>());
		isDefault ? parameter.setDefault(v) : parameter.setValue(v);
	} else if (type == "real") {
		double const v = realFromJson(tv.at("value"));
		isDefault ? parameter.setDefault(v) : parameter.setValue(v);
	} else if (type == "string") {
		std::string const v = tv.at("value").get<std::string>();
		isDefault ? parameter.setDefault(v) : parameter.setValue(v);
	} else if (type == "boolean") {
		bool const v = tv.at("value").get<bool>();
		isDefault ? parameter.setDefault(v) : parameter.setValue(v);
	} else if (type == "octets") {
		std::vector<unsigned char> const bytes = fromHex(tv.at("value").get<std::string>());
		ber::Octets const v(bytes.begin(), bytes.end());
		isDefault ? parameter.setDefault(v) : parameter.setValue(v);
	} else if (type == "null") {
		isDefault ? parameter.setDefault(ber::Null()) : parameter.setValue(ber::Null());
	} else {
		throw std::runtime_error("unsupported TypedValue type: " + type);
	}
}

static void applyParameterMinMax(glow::GlowParameterBase& parameter, json const& tv, bool isMaximum)
{
	std::string const type = tv.at("type").get<std::string>();
	if (type == "integer") {
		long const v = static_cast<long>(tv.at("value").get<long long>());
		isMaximum ? parameter.setMaximum(v) : parameter.setMinimum(v);
	} else if (type == "real") {
		double const v = realFromJson(tv.at("value"));
		isMaximum ? parameter.setMaximum(v) : parameter.setMinimum(v);
	} else {
		throw std::runtime_error("minimum/maximum must be integer or real, got: " + type);
	}
}

static void applyParameterContents(glow::GlowParameterBase& parameter, json const& c)
{
	if (c.contains("identifier"))
		parameter.setIdentifier(c.at("identifier").get<std::string>());
	if (c.contains("description"))
		parameter.setDescription(c.at("description").get<std::string>());
	if (c.contains("value"))
		applyParameterValue(parameter, c.at("value"), false);
	if (c.contains("minimum"))
		applyParameterMinMax(parameter, c.at("minimum"), false);
	if (c.contains("maximum"))
		applyParameterMinMax(parameter, c.at("maximum"), true);
	if (c.contains("access"))
		parameter.setAccess(glow::Access(static_cast<glow::Access::_Domain>(c.at("access").get<int>())));
	if (c.contains("format"))
		parameter.setFormat(c.at("format").get<std::string>());
	if (c.contains("enumeration"))
		parameter.setEnumeration(c.at("enumeration").get<std::string>());
	if (c.contains("factor"))
		parameter.setFactor(c.at("factor").get<int>());
	if (c.contains("isOnline"))
		parameter.setIsOnline(c.at("isOnline").get<bool>());
	if (c.contains("formula")) {
		std::string const formula = c.at("formula").get<std::string>();
		std::size_t const separator = formula.find('\n');
		if (separator == std::string::npos)
			throw std::runtime_error("canonical formula must contain a \\n separator");
		parameter.setFormula(formula.substr(0, separator), formula.substr(separator + 1));
	}
	if (c.contains("step"))
		parameter.setStep(c.at("step").get<int>());
	if (c.contains("default"))
		applyParameterValue(parameter, c.at("default"), true);
	if (c.contains("parameterType"))
		parameter.setType(
			glow::ParameterType(static_cast<glow::ParameterType::_Domain>(c.at("parameterType").get<int>())));
	if (c.contains("streamIdentifier"))
		parameter.setStreamIdentifier(c.at("streamIdentifier").get<int>());
	if (c.contains("enumMap")) {
		std::vector<std::pair<std::string, int>> entries;
		for (json const& entry : c.at("enumMap"))
			entries.emplace_back(entry.at("name").get<std::string>(), entry.at("value").get<int>());
		parameter.setEnumerationMap(entries.begin(), entries.end());
	}
	if (c.contains("streamDescriptor")) {
		json const& descriptor = c.at("streamDescriptor");
		parameter.setStreamDescriptor(
			glow::StreamFormat(static_cast<glow::StreamFormat::_Domain>(descriptor.at("format").get<int>())),
			descriptor.at("offset").get<int>());
	}
	if (c.contains("schemaIdentifiers"))
		parameter.setSchemaIdentifiers(c.at("schemaIdentifiers").get<std::string>());
	if (c.contains("templateReference"))
		parameter.setTemplateReference(oidFromString(c.at("templateReference").get<std::string>()));
}

static void applyMatrixContents(glow::GlowMatrixBase& matrix, json const& c)
{
	if (c.contains("identifier"))
		matrix.setIdentifier(c.at("identifier").get<std::string>());
	if (c.contains("description"))
		matrix.setDescription(c.at("description").get<std::string>());
	if (c.contains("matrixType"))
		matrix.setType(glow::MatrixType(static_cast<glow::MatrixType::_Domain>(c.at("matrixType").get<int>())));
	if (c.contains("addressingMode"))
		matrix.setAddressingMode(glow::MatrixAddressingMode(
			static_cast<glow::MatrixAddressingMode::_Domain>(c.at("addressingMode").get<int>())));
	if (c.contains("targetCount"))
		matrix.setTargetCount(c.at("targetCount").get<int>());
	if (c.contains("sourceCount"))
		matrix.setSourceCount(c.at("sourceCount").get<int>());
	if (c.contains("maximumTotalConnects"))
		matrix.setMaximumTotalConnects(c.at("maximumTotalConnects").get<int>());
	if (c.contains("maximumConnectsPerTarget"))
		matrix.setMaximumConnectsPerTarget(c.at("maximumConnectsPerTarget").get<int>());
	if (c.contains("parametersLocation")) {
		json const& location = c.at("parametersLocation");
		if (location.contains("basePath"))
			matrix.setParametersLocation(oidFromString(location.at("basePath").get<std::string>()));
		else
			matrix.setParametersLocation(location.at("inline").get<int>());
	}
	if (c.contains("gainParameterNumber"))
		matrix.setGainParameterNumber(c.at("gainParameterNumber").get<int>());
	if (c.contains("labels")) {
		dom::Sequence* labels = matrix.labels();
		for (json const& label : c.at("labels")) {
			labels->insert(labels->end(),
				new glow::GlowLabel(
					oidFromString(label.at("basePath").get<std::string>()), label.at("description").get<std::string>()));
		}
	}
	if (c.contains("schemaIdentifiers"))
		matrix.setSchemaIdentifiers(c.at("schemaIdentifiers").get<std::string>());
	if (c.contains("templateReference"))
		matrix.setTemplateReference(oidFromString(c.at("templateReference").get<std::string>()));
	if (c.contains("targets")) {
		dom::Sequence* targets = matrix.targets();
		for (json const& target : c.at("targets"))
			targets->insert(targets->end(), new glow::GlowTarget(target.get<int>()));
	}
	if (c.contains("sources")) {
		dom::Sequence* sources = matrix.sources();
		for (json const& source : c.at("sources"))
			sources->insert(sources->end(), new glow::GlowSource(source.get<int>()));
	}
	if (c.contains("connections")) {
		dom::Sequence* connections = matrix.connections();
		for (json const& entry : c.at("connections")) {
			auto* connection = new glow::GlowConnection(entry.at("target").get<int>());
			if (entry.contains("sources")) {
				std::vector<std::size_t> items;
				for (json const& source : entry.at("sources"))
					items.push_back(source.get<std::size_t>());
				connection->setSources(ber::ObjectIdentifier(items.begin(), items.end()));
			}
			if (entry.contains("operation"))
				connection->setOperation(glow::ConnectionOperation(
					static_cast<glow::ConnectionOperation::_Domain>(entry.at("operation").get<int>())));
			if (entry.contains("disposition"))
				connection->setDisposition(glow::ConnectionDisposition(
					static_cast<glow::ConnectionDisposition::_Domain>(entry.at("disposition").get<int>())));
			connections->insert(connections->end(), connection);
		}
	}
}

static void applyTupleList(dom::Sequence* sequence, json const& items)
{
	for (json const& item : items) {
		std::string const name = item.contains("name") ? item.at("name").get<std::string>() : std::string();
		sequence->insert(sequence->end(),
			new glow::GlowTupleItemDescription(
				glow::ParameterType(static_cast<glow::ParameterType::_Domain>(item.at("type").get<int>())), name));
	}
}

static void applyFunctionContents(glow::GlowFunctionBase& function, json const& c)
{
	if (c.contains("identifier"))
		function.setIdentifier(c.at("identifier").get<std::string>());
	if (c.contains("description"))
		function.setDescription(c.at("description").get<std::string>());
	if (c.contains("args"))
		applyTupleList(function.arguments(), c.at("args"));
	if (c.contains("result"))
		applyTupleList(function.result(), c.at("result"));
	if (c.contains("templateReference"))
		function.setTemplateReference(oidFromString(c.at("templateReference").get<std::string>()));
}

static glow::GlowInvocation* buildInvocation(json const& c)
{
	auto* invocation = new glow::GlowInvocation();
	if (c.contains("id"))
		invocation->setInvocationId(c.at("id").get<int>());
	if (c.contains("args")) {
		dom::Sequence* sequence = invocation->arguments();
		for (json const& value : c.at("args"))
			sequence->insert(sequence->end(), berLeafFromJson(glow::GlowTags::ElementDefault(), value));
	}
	return invocation;
}

static glow::GlowCommand* buildCommand(json const& element)
{
	json const& c = element.at("contents");
	int const number = element.at("number").get<int>();
	auto* command = new glow::GlowCommand(glow::CommandType(static_cast<glow::CommandType::_Domain>(number)));
	if (c.contains("dirFieldMask"))
		command->setDirFieldMask(
			glow::DirFieldMask(static_cast<glow::DirFieldMask::_Domain>(c.at("dirFieldMask").get<int>())));
	if (c.contains("invocation"))
		command->setInvocation(buildInvocation(c.at("invocation")));
	return command;
}

static glow::GlowElement* buildElement(json const& element)
{
	json const& c = element.at("contents");
	std::string const kind = c.at("kind").get<std::string>();
	bool const qualified = element.contains("path");

	if (kind == "command") {
		if (qualified)
			throw std::runtime_error("commands cannot be qualified");
		return buildCommand(element);
	}

	if (kind == "node") {
		if (qualified) {
			auto* node = new glow::GlowQualifiedNode(oidFromString(element.at("path").get<std::string>()));
			applyNodeContents(*node, c);
			buildChildrenInto(node->children(), element);
			return node;
		}
		auto* node = new glow::GlowNode(element.at("number").get<int>());
		applyNodeContents(*node, c);
		buildChildrenInto(node->children(), element);
		return node;
	}
	if (kind == "parameter") {
		if (qualified) {
			auto* parameter = new glow::GlowQualifiedParameter(oidFromString(element.at("path").get<std::string>()));
			applyParameterContents(*parameter, c);
			buildChildrenInto(parameter->children(), element);
			return parameter;
		}
		auto* parameter = new glow::GlowParameter(element.at("number").get<int>());
		applyParameterContents(*parameter, c);
		buildChildrenInto(parameter->children(), element);
		return parameter;
	}
	if (kind == "matrix") {
		if (qualified) {
			auto* matrix = new glow::GlowQualifiedMatrix(oidFromString(element.at("path").get<std::string>()));
			applyMatrixContents(*matrix, c);
			buildChildrenInto(matrix->children(), element);
			return matrix;
		}
		auto* matrix = new glow::GlowMatrix(element.at("number").get<int>());
		applyMatrixContents(*matrix, c);
		buildChildrenInto(matrix->children(), element);
		return matrix;
	}
	if (kind == "function") {
		if (qualified) {
			auto* function = new glow::GlowQualifiedFunction(oidFromString(element.at("path").get<std::string>()));
			applyFunctionContents(*function, c);
			buildChildrenInto(function->children(), element);
			return function;
		}
		auto* function = new glow::GlowFunction(element.at("number").get<int>());
		applyFunctionContents(*function, c);
		buildChildrenInto(function->children(), element);
		return function;
	}
	if (kind == "template") {
		glow::GlowTemplateBase* base;
		glow::GlowElement* result;
		if (qualified) {
			auto* tmpl = new glow::GlowQualifiedTemplate(oidFromString(element.at("path").get<std::string>()));
			base = tmpl;
			result = tmpl;
		} else {
			auto* tmpl = new glow::GlowTemplate(element.at("number").get<int>());
			base = tmpl;
			result = tmpl;
		}
		if (c.contains("description"))
			base->setDescription(c.at("description").get<std::string>());
		if (c.contains("element"))
			base->setElement(buildTemplateElement(c.at("element")));
		return result;
	}
	throw std::runtime_error("unsupported element kind: " + kind);
}

// A template's element must carry the Template::Element tag (context 1) —
// GlowTemplateBase::setElement silently DROPS elements with any other tag, so
// the default-tagged nodes from buildElement cannot be used here.
static glow::GlowElement* buildTemplateElement(json const& element)
{
	json const& c = element.at("contents");
	std::string const kind = c.at("kind").get<std::string>();
	int const number = element.at("number").get<int>();
	ber::Tag const tag = glow::GlowTags::Template::Element();

	if (kind == "node") {
		auto* node = new glow::GlowNode(number, tag);
		applyNodeContents(*node, c);
		buildChildrenInto(node->children(), element);
		return node;
	}
	if (kind == "parameter") {
		auto* parameter = new glow::GlowParameter(number, tag);
		applyParameterContents(*parameter, c);
		buildChildrenInto(parameter->children(), element);
		return parameter;
	}
	if (kind == "matrix") {
		auto* matrix = new glow::GlowMatrix(number, tag);
		applyMatrixContents(*matrix, c);
		buildChildrenInto(matrix->children(), element);
		return matrix;
	}
	if (kind == "function") {
		auto* function = new glow::GlowFunction(number, tag);
		applyFunctionContents(*function, c);
		buildChildrenInto(function->children(), element);
		return function;
	}
	throw std::runtime_error("unsupported template element kind: " + kind);
}

static std::vector<unsigned char> encodeRootFromJson(json const& root)
{
	libember::util::OctetStream output;
	std::string const rootType = root.at("rootType").get<std::string>();
	if (rootType == "elements") {
		glow::GlowRootElementCollection collection;
		for (json const& element : root.at("elements"))
			collection.insert(collection.end(), buildElement(element));
		collection.encode(output);
	} else if (rootType == "streams") {
		glow::GlowStreamCollection collection;
		for (json const& entry : root.at("streams")) {
			int const identifier = entry.at("identifier").get<int>();
			// Built from raw leaves rather than the GlowStreamEntry convenience
			// constructors: those go through int/glow::Value and lack boolean
			// support (and truncate wide integers via glow::Variant).
			auto* streamEntry = new glow::GlowStreamEntry(glow::GlowTags::ElementDefault());
			streamEntry->insert(streamEntry->end(),
				new dom::VariantLeaf(glow::GlowTags::StreamEntry::StreamIdentifier(), identifier));
			streamEntry->insert(streamEntry->end(),
				berLeafFromJson(glow::GlowTags::StreamEntry::StreamValue(), entry.at("value")));
			collection.insert(streamEntry);
		}
		collection.encode(output);
	} else if (rootType == "invocationResult") {
		json const& inner = root.at("invocationResult");
		glow::GlowInvocationResult result;
		result.setInvocationId(inner.at("id").get<int>());
		if (inner.contains("success"))
			result.setSuccess(inner.at("success").get<bool>());
		if (inner.contains("result")) {
			dom::Sequence* sequence = result.result();
			for (json const& value : inner.at("result"))
				sequence->insert(sequence->end(), berLeafFromJson(glow::GlowTags::ElementDefault(), value));
		}
		result.encode(output);
	} else {
		throw std::runtime_error("unsupported rootType: " + rootType);
	}
	return std::vector<unsigned char>(output.begin(), output.end());
}

static std::unique_ptr<dom::Node> decodeRootFromBytes(std::vector<unsigned char> const& bytes)
{
	// libember's DomReader is not hardened against malformed input (it reads
	// unchecked from the stream and segfaults on e.g. empty input or a leading
	// zero tag), so reject anything that is not rooted in the Glow Root tag
	// before handing it over. The suite only feeds it output of the two
	// encoders under test, so this is a guard, not a validator.
	if (bytes.empty())
		throw std::runtime_error("empty input");
	if (bytes[0] != 0x60)
		throw std::runtime_error("input does not start with the Glow Root tag (0x60)");

	libember::util::OctetStream input;
	input.append(bytes.begin(), bytes.end());
	dom::DomReader reader;
	dom::Node* root = reader.decodeTree(input, glow::GlowNodeFactory::getFactory());
	if (root == nullptr)
		throw std::runtime_error("libember decoded no tree from input");
	return std::unique_ptr<dom::Node>(root);
}

// ---------------------------------------------------------------------------
// S101 framing (libs101 provides escaping + CRC; the header layout follows the
// Ember+ S101 specification)
// ---------------------------------------------------------------------------

namespace {
	unsigned char const S101_SLOT = 0x00;
	unsigned char const S101_MSG_EMBER = 0x0e;
	unsigned char const S101_CMD_EMBER = 0x00;
	unsigned char const S101_CMD_KEEPALIVE_REQ = 0x01;
	unsigned char const S101_CMD_KEEPALIVE_RESP = 0x02;
	unsigned char const S101_VERSION = 0x01;
	unsigned char const S101_DTD_GLOW = 0x01;
	unsigned char const GLOW_DTD_VERSION_MINOR = 0x1f;
	unsigned char const GLOW_DTD_VERSION_MAJOR = 0x02;

	unsigned char const FLAG_SINGLE_PACKET = 0xc0;
	unsigned char const FLAG_FIRST_MULTI_PACKET = 0x80;
	unsigned char const FLAG_LAST_MULTI_PACKET = 0x40;
	unsigned char const FLAG_MULTI_PACKET = 0x00;
}

static std::string encodeS101Frame(std::vector<unsigned char> const& message)
{
	libs101::StreamEncoder<unsigned char> encoder;
	encoder.encode(message.begin(), message.end());
	encoder.finish();
	return toHex(encoder.begin(), encoder.end());
}

static json s101FrameFromJson(json const& request)
{
	std::string const command = request.at("command").get<std::string>();
	json frames = json::array();

	if (command == "keepaliveRequest" || command == "keepaliveResponse") {
		std::vector<unsigned char> const message{ S101_SLOT, S101_MSG_EMBER,
			command == "keepaliveRequest" ? S101_CMD_KEEPALIVE_REQ : S101_CMD_KEEPALIVE_RESP, S101_VERSION };
		frames.push_back(encodeS101Frame(message));
		return frames;
	}
	if (command != "ember")
		throw std::runtime_error("unsupported s101 command: " + command);

	std::vector<unsigned char> const payload = fromHex(request.at("payload").get<std::string>());
	std::size_t const packetSize = request.contains("packetSize") ? request.at("packetSize").get<std::size_t>() : 1024;
	if (packetSize == 0)
		throw std::runtime_error("packetSize must be > 0");

	std::size_t const packetCount = payload.size() <= packetSize ? 1 : (payload.size() + packetSize - 1) / packetSize;
	for (std::size_t index = 0; index < packetCount; ++index) {
		unsigned char flags;
		if (packetCount == 1)
			flags = FLAG_SINGLE_PACKET;
		else if (index == 0)
			flags = FLAG_FIRST_MULTI_PACKET;
		else if (index == packetCount - 1)
			flags = FLAG_LAST_MULTI_PACKET;
		else
			flags = FLAG_MULTI_PACKET;

		std::vector<unsigned char> message{ S101_SLOT, S101_MSG_EMBER, S101_CMD_EMBER, S101_VERSION, flags,
			S101_DTD_GLOW, 0x02, GLOW_DTD_VERSION_MINOR, GLOW_DTD_VERSION_MAJOR };
		std::size_t const chunkStart = index * packetSize;
		std::size_t const chunkEnd = std::min(payload.size(), chunkStart + packetSize);
		message.insert(message.end(), payload.begin() + chunkStart, payload.begin() + chunkEnd);
		frames.push_back(encodeS101Frame(message));
	}
	return frames;
}

static json s101UnframeFromHex(std::string const& hex)
{
	std::vector<unsigned char> const bytes = fromHex(hex);
	json messages = json::array();

	libs101::StreamDecoder<unsigned char> decoder;
	decoder.read(bytes.begin(), bytes.end(), [&messages](auto first, auto last) {
		std::vector<unsigned char> const message(first, last);
		if (message.size() < 4)
			throw std::runtime_error("s101 message shorter than minimal header");
		json out;
		out["slot"] = message[0];
		out["message"] = message[1];
		out["command"] = message[2];
		out["version"] = message[3];
		if (message[2] == S101_CMD_EMBER) {
			if (message.size() < 7)
				throw std::runtime_error("s101 ember message shorter than ember header");
			out["flags"] = message[4];
			out["dtd"] = message[5];
			std::size_t const appBytesCount = message[6];
			if (message.size() < 7 + appBytesCount)
				throw std::runtime_error("s101 ember message truncated in app bytes");
			out["appBytes"] = toHex(message.begin() + 7, message.begin() + 7 + appBytesCount);
			out["payload"] = toHex(message.begin() + 7 + appBytesCount, message.end());
		}
		messages.push_back(std::move(out));
	});
	return messages;
}

// ---------------------------------------------------------------------------
// Exported ABI
// ---------------------------------------------------------------------------

#define EPS_GUARD(body)                         \
	try {                                       \
		body                                    \
	} catch (std::exception const& e) {         \
		return failResult(e.what());            \
	} catch (...) {                             \
		return failResult("unknown C++ error"); \
	}

extern "C" {

char* eps_glow_decode(char const* hex)
{
	EPS_GUARD({
		std::unique_ptr<dom::Node> const root = decodeRootFromBytes(fromHex(hex));
		return okResult(rootToJson(*root));
	})
}

char* eps_glow_encode(char const* canonicalJson)
{
	EPS_GUARD({
		std::vector<unsigned char> const bytes = encodeRootFromJson(json::parse(canonicalJson));
		return okResult(toHex(bytes.begin(), bytes.end()));
	})
}

char* eps_glow_roundtrip(char const* hex)
{
	EPS_GUARD({
		std::unique_ptr<dom::Node> const root = decodeRootFromBytes(fromHex(hex));
		json canonical = rootToJson(*root);
		libember::util::OctetStream output;
		root->encode(output);
		json result;
		result["canonical"] = std::move(canonical);
		result["hex"] = toHex(output.begin(), output.end());
		return okResult(result);
	})
}

char* eps_s101_frame(char const* requestJson)
{
	EPS_GUARD({ return okResult(s101FrameFromJson(json::parse(requestJson))); })
}

char* eps_s101_unframe(char const* hex)
{
	EPS_GUARD({ return okResult(s101UnframeFromHex(hex)); })
}

char* eps_version(char const*)
{
	EPS_GUARD({
		json out;
		out["pin"] = EMBERPLUS_PIN;
		return okResult(out);
	})
}

void eps_free(char* p)
{
	std::free(p);
}

} // extern "C"
