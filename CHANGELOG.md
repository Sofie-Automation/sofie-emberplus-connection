# Changelog

All notable changes to this project will be documented in this file. See [Convential Commits](https://www.conventionalcommits.org/en/v1.0.0/#specification) for commit guidelines.

## [0.3.1](https://github.com/Sofie-Automation/sofie-emberplus-connection/compare/v0.3.0...v0.3.1) (Tue Oct 14 2025)


### Fixes

* fixed length for slicing when handling updates [3722d65](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/3722d65b480b7efc8ffad0cd4eb58984125d2160)


## [0.3.0](https://github.com/Sofie-Automation/sofie-emberplus-connection/compare/v0.2.2...v0.3.0) (Mon Feb 17 2025)


### Features

* revert gitignore to non dist branch [e9fe8ba](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/e9fe8bae60d0bbf06ea238770c425b0bb7b91766)
* cleanup console.logs prior to PR [c30b120](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/c30b120856a5aeba76664d576fb80a3617fae5f2)
* treat data in chunks handling only escaped characters [74dca29](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/74dca299038d735bb8967aa0294e51dd86fb48d2)
* remove ratelimit in streamManager (as one is added in dataIn() [2ddaeda](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/2ddaeda24cfc0cf0afca828e4b6da486337e2b02)
* optimisation in dataIn() - iterate over frames instead of each byte [5847f0a](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/5847f0a02156d632cb53b5b151f838b01e2d5ffb)
* cap limit on streams in dataIn() [1d5ba59](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/1d5ba59155bc73dc2133976403cd61b430706139)
* Simplify stream handling to parse meter data without BER decoding [560fd54](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/560fd546f313332298999f79cb2a9db621770256)
* ratelimit meter updates [48d50bc](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/48d50bc7e5f019ba4026524cbcc1d9fa39fbcedb)
* update mc2 mocks [180bbce](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/180bbcef8b5a551483af9c002e858399e55cf87f)
* optimise StreamManage with identifier lookup table [be86a3d](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/be86a3dddd7a66a70dbf67575760fdd0186eee30)
* Streamanager log if unregistered update [477e0f8](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/477e0f88f2e88bb78ee8fbfb23817b5acaf17d82)
* example of r3lay patchbay streaming [2de55f5](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/2de55f5c24fa87e5d3f8cdc095a027c3456d2038)
* add debugging in S101Client [3b95449](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/3b9544914e4943ad782eecc0da91fd0daac9a7b7)
* add a MC2_mock.js in examples folder [a532c3b](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/a532c3bc7a93c05c1fd1cc9c3f3b36e029e3651e)
* update tests to client's internal StreamManager [bb60778](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/bb6077816f0410a94fee820fbcb5a72749538787)
* update README.md [616d8cc](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/616d8ccc96c81fc2771c5926e812b5134a9f18fa)
* StreamManager is only used internally [e2d5072](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/e2d5072ad0b6da5521dc70ccf4de2911c9733e32)
* separate emberPackets and emberStreamPackets [c00bb10](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/c00bb108abcca329d9cdf6a25a8a420fabd20824)
* getInternalNodePath() to handle that there's no path on numbered Tree nodes and this must be calculated. [99541a0](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/99541a0317010b12f780b6851b2347612e7c2dd4)
* cleaup code from first stream implementation [1284b28](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/1284b2828a15fb9f787ce53ecebcc7e992ec2e2c)
* use path to register streams and handle decoding in StreamManager [a396b0d](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/a396b0d9e708d00d8de507370a946f33132a9c5d)
* StreamManager class for handling stream subscriptions [2b638fd](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/2b638fd6adff9800a3998060c7029eacee8b6f10)

### Fixes

* isEmberStreampacket() function to ensure different size of stream packages [1022745](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/10227455e7b49309c4d66ff09083a52e97be3ceb)
* add stream cap limit in new chunk based structure [143d6ca](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/143d6caf88daf50fd43f14e76d7369301f07c2f1)
* look for streaming data in the correct posistion [e49c42f](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/e49c42f1cc2ac6f6efb1708ab8561539d3dbe4d7)
* extract correct values from raw streamPackage [091de84](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/091de8447898d96e81a89dded36edcdb91c802b4)
* read correct streamIdentifier in parseStreamPacket [e79cc5f](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/e79cc5fb2c8d0bd6b4c2bfb015e26209f8737a2a)
* remove unwanted extensive log in client [e6d9fc8](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/e6d9fc8bc40529714ca835c201df477b853deb8a)
* ensure value on offset [1c85dac](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/1c85dac94ce169824576e0fdc00e27dd345564c6)
* only register a parameter once [eb0f9e7](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/eb0f9e7574f812436f60cbd2ada706f231834e90)
* emit emberStreamTree if stream packet [3e0aff9](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/3e0aff9dec8b5a24354263f50d6018243536c007)
* handle single stream packets [2e8d917](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/2e8d91724110ffd5e0c61720b47a6a19450076c0)
* multiPacket can also be non stream packets [7346f7d](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/7346f7d2cf89b92be9ea6bb882078545298ba77e)
* revert check if node is a parameter [684609a](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/684609aebfa0c7e658d861f420a1dde0cf127284)
* StreamManager should not be a singleton [22d61b9](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/22d61b9bd75d984981a0b1b0eeb0911bb0a5ef68)
* handle integer stream type [bb3ca20](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/bb3ca20b8e5727909a471d457fac6b7a2d41bdbc)
* StreamManager test use real values. [63dea41](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/63dea41999a6365d1029f6744780a123f0be6de2)
* streamEntry.value can be zero [60a0e8f](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/60a0e8ffc75fd35265e002e5ca87c274c4d819a8)
* handle offset=0 [78c1660](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/78c16601a94a8fc3d1facb29b6cb44342594764b)
* some Ember implementations has an empty string as identifier [d46a5a3](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/d46a5a37dcf015e38141e37854059319a62d631b)

## [0.2.2](https://github.com/Sofie-Automation/sofie-emberplus-connection/compare/v0.2.1...v0.2.2) (Fri Sep 20 2024)


### Fixes

* extra getDir for parameters to explicitly express interest in value changes [c6f684c](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/c6f684cc3d4870c971de3446360464fae055b284)
* **(Provider)** handle getDirectory on empty node correctly [8abda16](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/8abda1609cb19bf77d6d5548c34437d7ce7b9d62)
* handle getDirectory on root multiple times [cb375cc](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/cb375cc41ac2f3205b970fc6a13fa533ae0b362e)
* handle getDirectory on paramater [e8f131d](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/e8f131d096641bff1d36acef90a18b9d0a31353a)

## [0.2.1](https://github.com/Sofie-Automation/sofie-emberplus-connection/compare/v0.2.0...v0.2.1) (Mon Oct 16 2023)


## [0.2.0](https://github.com/Sofie-Automation/sofie-emberplus-connection/compare/v0.1.2...v0.2.0) (Mon Oct 16 2023)


### Fixes

* Setting 2 full path properties fails SOFIE-2628 (#34) [3d756ae](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/3d756aec59998015d4f0f331720dcb517d677b43)
* children should be stored in object [ee926d2](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/ee926d21cafc3368dac152daa122b35310aa2c6a)
* :bug: relative to issue #32 [70e8333](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/70e8333294a79db518729604fb0ac7e8e68cc9bb)
* implement timeout for keepalive requests [d59b7b2](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/d59b7b2a0418ce16fcf3f7ed384beb0346562f63)

### Features

* use typed eventemitter3 [ff3551e](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/ff3551e3667ffd39148745184058f8664adbde03)

### [0.1.2](https://github.com/Sofie-Automation/sofie-emberplus-connection/compare/v0.0.2...v0.1.2) (2022-01-17)


### ⚠ BREAKING CHANGES

* drop node 10 support

### Features

* emberplus provider ([babc51c](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/babc51c7b9f328d36fc0e327dfde2a60255d1ee6))
* optional path delimiter ([b7bf058](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/b7bf058ce192dfb863374eadbb783f706f01b777)), closes [#17](https://github.com/Sofie-Automation/sofie-emberplus-connection/issues/17)


### Bug Fixes

* **ber:** enum value is encoded as int ([4e2267a](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/4e2267a0e9a5b4be02e62d628361666b7cbf7e8b))
* client socket should send keepAlives ([88534e2](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/88534e2a77e5b39913f70136afa90863e67ae9da))
* codecov ([3db375b](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/3db375b03f72b25f41bc39a0dc2e6b817f8f779d))
* empty parameter type ([d69e0d7](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/d69e0d72b86d7230bbf52dc55609c0850ced87a4))
* increase robustness in connection / invocation decoder ([ef28575](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/ef28575e0835f8e3f3d682898d4d24647fb8b8c1))
* **provider:** build correct path from children in request [publish] ([7dcfda5](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/7dcfda5937f85cb2cf8066620d6a1beb22da0e69))
* **provider:** catch and emit errors from clients ([cdece29](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/cdece29a4210381704bface783d227f3b8af857a))
* **provider:** requests consisting of NumberedTreeNodes ([732e393](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/732e3935a252d668c7ca0eee569b34e20a4bd49a))
* Updated since the repo name has changed ([3917fc8](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/3917fc850dbc722655e17bcf11b002117ad0f758))


* drop node 10 support ([2753c36](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/2753c3665ba649926511e11a3df8f58683e127fe))

### [0.1.1](https://github.com/Sofie-Automation/sofie-emberplus-connection/compare/0.1.0...0.1.1) (2022-01-17)


### Bug Fixes

* codecov ([3db375b](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/3db375b03f72b25f41bc39a0dc2e6b817f8f779d))

## [0.1.0](https://github.com/Sofie-Automation/sofie-emberplus-connection/compare/0.0.4...0.1.0) (2022-01-17)

### ⚠ BREAKING CHANGES

- drop node 10 support

### Features

- optional path delimiter ([b7bf058](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/b7bf058ce192dfb863374eadbb783f706f01b777)), closes [#17](https://github.com/Sofie-Automation/sofie-emberplus-connection/issues/17)

### Bug Fixes

- empty parameter type ([d69e0d7](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/d69e0d72b86d7230bbf52dc55609c0850ced87a4))
- Updated since the repo name has changed ([3917fc8](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/3917fc850dbc722655e17bcf11b002117ad0f758))

- drop node 10 support ([2753c36](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/2753c3665ba649926511e11a3df8f58683e127fe))

### [0.0.4](https://github.com/Sofie-Automation/sofie-emberplus-connection/compare/0.0.3...0.0.4) (2020-12-01)

### Bug Fixes

- **provider:** build correct path from children in request [publish] ([7dcfda5](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/7dcfda5937f85cb2cf8066620d6a1beb22da0e69))
- **provider:** requests consisting of NumberedTreeNodes ([732e393](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/732e3935a252d668c7ca0eee569b34e20a4bd49a))

### [0.0.3](https://github.com/Sofie-Automation/sofie-emberplus-connection/compare/v0.0.2...v0.0.3) (2020-08-17)

### Features

- emberplus provider ([babc51c](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/babc51c7b9f328d36fc0e327dfde2a60255d1ee6))

### Bug Fixes

- **provider:** catch and emit errors from clients ([cdece29](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/cdece29a4210381704bface783d227f3b8af857a))
- client socket should send keepAlives ([88534e2](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/88534e2a77e5b39913f70136afa90863e67ae9da))
- increase robustness in connection / invocation decoder ([ef28575](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/ef28575e0835f8e3f3d682898d4d24647fb8b8c1))
- **ber:** enum value is encoded as int ([4e2267a](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/4e2267a0e9a5b4be02e62d628361666b7cbf7e8b))

### 0.0.2 (2020-06-08)

### Features

- basic type predicate for Parameter interface ([19570fe](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/19570fe3709aa5986863099d8ccd3e9d9e390659))
- Ber.Reader converted to TypeScript ([3858f61](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/3858f619fabe71cf1f7f48ff0a4295fe2de888e6))
- Ber.Writer converted to TypeScript ([bea3219](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/bea3219491cfb7b6a0c88ccb0a581955f406a916))
- convert error classes to typescript ([adb4cc4](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/adb4cc4bc94911c6c130b53cc52d87714385f3b8))
- create library index ([fc9d513](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/fc9d513c522c1dafe15da78365d34961a7c32caa))
- forgiving decoder ([03c72c5](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/03c72c5e2875d0e97df817ad3a088ae59adf8197))
- hack setValue to immediately resolve - added setValueWithHacksaw() function from NRKNO fork ([3b382b7](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/3b382b7352dfde79e295b94956f1f76a765dd5e8))
- library skeleton ([5d0c922](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/5d0c922012a6ae55b3bba843af4da6f763061666))
- reconnection logic (ported from nrkno/develop branch) ([232d508](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/232d5086cc3644297d961c1e0a2b5ad1446a45d4))
- remove creation of a new reader for each tag ([e64d11d](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/e64d11dfcae956e137f69e2a17d591da757fd19d))
- resends, timeouts, refactor for collections ([138241d](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/138241d1ac6af8ee4a1a10ab4b45ed85e9f808b9))
- separate method for ber encoding ember+ data structures ([4b9f947](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/4b9f9471024e7c915be71c371b3ed719c3be541f))
- setValueNoAck - rename of function and cleanup ([82618c3](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/82618c3ccc13b6355c893a47bafd1d226c7e86ae))
- type predicate function for EmberElement interface ([331f623](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/331f623eee4583c8b13f6b53f3dee1ade7c48638))
- **ber encoding:** Adds type to Ember.ParameterContents objects. Allows for explicitly setting Real ParameterContents types to enforce correct encoding. ([153eed8](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/153eed853b31eeaf5f79b76bf603ba01e2c4e177))
- **Functions:** Adds Invoke method for QualifiedFunctions with InvocationResult. ([9013dfe](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/9013dfea6b2392ca97f6e4423a3a98d5b6f087bb))

### Bug Fixes

- add missing code, pass tests ([dd3d884](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/dd3d88430f421b43f9f3b613cfccc2e0beb4ab2e))
- better error message for getEleByPath ([8c1c5be](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/8c1c5bee5f95e13298fe318af1be00349c34a92d))
- changes is an array [publish] ([f41e58d](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/f41e58d832ed6a19d5220eba04c4b54427d0a482))
- convert tree arrays into collections ([6974cc9](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/6974cc9085fee76e9cf30f980c32c6a374de8f41))
- do not expand functions and offline nodes ([fad784e](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/fad784e3cef4d635021fc8a2774a03ee30117a5c))
- fix Ber writeReal and writeValue ([d39e90a](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/d39e90a746f5c41ff45f8f08231c5885b22bbc2c))
- getDirectory on node should auto subscribe to child modification ([66578f0](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/66578f008ab3f7c127bdcfbb1dc2247deb675a77))
- handle indefinite lengths and empty contents ([34f7ff3](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/34f7ff3bd90345126ff92e1ffc6b9b617e5f6e55))
- make linting job actually work ([d7eef92](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/d7eef926fc864324b1dc9b10c63c6faf02d372a1))
- missing continue for error recovery ([9b3935f](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/9b3935f91e6a02173eefe48b796b5f118f1ee720))
- missing skipNext for error recovery ([53b7434](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/53b74344c5a644a95112bb049f30ab1881cf3216))
- promise didn´t resolve ([9110000](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/91100007882c08b814b84424726ea21543e4345d))
- reading and writing NULL values ([fcf979e](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/fcf979eb78a5c8acecbc83f3e6a2cc947fb4c3d0))
- write zero-length buffers and null parameters ([d910ef6](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/d910ef64a8426d6c90d24d54603642a74344c1e7))
- **ber encoding:** Fixed unecessary nesting of ParameterContents if using strong typed ParameterContents ([1661251](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/16612512a242232f9595c02265d16e7efbe77d61))
- **KeepAliveRequest:** Fixes broken KeepAlieveRequest. ([8a99bb6](https://github.com/Sofie-Automation/sofie-emberplus-connection/commit/8a99bb624c695f76bf9ae30b3a0d63e413bdcd52))
