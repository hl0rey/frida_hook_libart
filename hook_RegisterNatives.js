
function find_RegisterNatives(params) {
    console.log("[!]find_RegisterNatives start");
    var module = Process.findModuleByName("libart.so");
    if (module == null) {
        console.log("[X]libart.so not found");
        return;
    }else{
        console.log("[!]libart.so base:", module.base);
        console.log("[!]libart.so size:", module.size);
        console.log("[!]libart.so path:", module.path);
    }
    

    let symbols = module.enumerateSymbols();
    if (symbols.length==0) {
        console.log("[X]symbols is empty,so maybe stripped.");
        console.log("[!]try to get Exports.")
        symbols = module.enumerateExports();
        console.log("[!]Exports length:",symbols.length)
    }
    

    let addrRegisterNatives = null;
    for (let i = 0; i < symbols.length; i++) {
        let symbol = symbols[i];
        
        //_ZN3art3JNI15RegisterNativesEP7_JNIEnvP7_jclassPK15JNINativeMethodi
        if (symbol.name.indexOf("art") >= 0 &&
                symbol.name.indexOf("JNI") >= 0 && 
                symbol.name.indexOf("RegisterNatives") >= 0 && 
                symbol.name.indexOf("CheckJNI") < 0) {
            addrRegisterNatives = symbol.address;
            console.log("[*]RegisterNatives is at ", symbol.address, symbol.name);
            hook_RegisterNatives(addrRegisterNatives)
        }
    }

}

function hook_RegisterNatives(addrRegisterNatives) {

    if (addrRegisterNatives != null) {
        Interceptor.attach(addrRegisterNatives, {
            onEnter: function (args) {
                console.log("[!][RegisterNatives] onEnter",addrRegisterNatives);

                console.log("[*][RegisterNatives] method_count:", args[3]);
                let java_class = args[1];
                let class_name = Java.vm.tryGetEnv().getClassName(java_class);
                console.log("[*][RegisterNatives] class_name:", class_name);

                let methods_ptr = ptr(args[2]);

                let method_count = parseInt(args[3]);
                for (let i = 0; i < method_count; i++) {
                    let name_ptr = methods_ptr.add(i * Process.pointerSize * 3).readPointer();
                    let sig_ptr = methods_ptr.add(i * Process.pointerSize * 3 + Process.pointerSize).readPointer();
                    let fnPtr_ptr = methods_ptr.add(i * Process.pointerSize * 3 + Process.pointerSize * 2).readPointer();
                    let name = name_ptr.readCString();
                    let sig = sig_ptr.readCString();
                    let symbol = DebugSymbol.fromAddress(fnPtr_ptr)
                    console.log("[*][RegisterNatives] java_class:", class_name, "name:", name, "sig:", sig, "fnPtr:", fnPtr_ptr,  " fnOffset:", symbol, " callee:", DebugSymbol.fromAddress(this.returnAddress));
                }
            }
        });
    }
}

setImmediate(find_RegisterNatives);
