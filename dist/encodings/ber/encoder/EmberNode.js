"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeNode = void 0;
const tslib_1 = require("tslib");
const Ber = tslib_1.__importStar(require("../../../Ber"));
function encodeNode(node, writer) {
    writer.startSequence(Ber.BERDataTypes.SET);
    if (node.identifier != null) {
        writer.startSequence(Ber.CONTEXT(0));
        writer.writeString(node.identifier, Ber.BERDataTypes.STRING);
        writer.endSequence(); // Ber.CONTEXT(0)
    }
    if (node.description != null) {
        writer.startSequence(Ber.CONTEXT(1));
        writer.writeString(node.description, Ber.BERDataTypes.STRING);
        writer.endSequence(); // Ber.CONTEXT(1)
    }
    if (node.isRoot != null) {
        writer.startSequence(Ber.CONTEXT(2));
        writer.writeBoolean(node.isRoot);
        writer.endSequence(); // Ber.CONTEXT(2)
    }
    if (node.isOnline != null) {
        writer.startSequence(Ber.CONTEXT(3));
        writer.writeBoolean(node.isOnline);
        writer.endSequence(); // Ber.CONTEXT(3)
    }
    if (node.schemaIdentifiers != null) {
        writer.startSequence(Ber.CONTEXT(4));
        writer.writeString(node.schemaIdentifiers, Ber.BERDataTypes.STRING);
        writer.endSequence(); // Ber.CONTEXT(4)
    }
    if (node.templateReference != null) {
        writer.startSequence(Ber.CONTEXT(5));
        writer.writeRelativeOID(node.templateReference, Ber.BERDataTypes.RELATIVE_OID);
        writer.endSequence(); // Ber.CONTEXT(3)
    }
    writer.endSequence(); // Ber.BERDataTypes.SET
}
exports.encodeNode = encodeNode;
//# sourceMappingURL=EmberNode.js.map