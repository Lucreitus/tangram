var through = require('through2');

var source_variable = '__worker_src__'; // variable name used to refer to the Tangram source code
var source_origin = '__worker_src_origin__'; // variable name used to refer to URL origin of source code (e.g., "http://localhost:8000/dist/tangram.debug.js")

// prepend this code - wraps Tangram source in a function and later calls arguments.callee.toString to get source
var prefix = '(function(){';
    prefix += 'var target = (typeof module !== "undefined" && module.exports) || (typeof window !== "undefined");';
    prefix += 'if (target) {';
    prefix += 'var ' + source_variable + ' = arguments.callee.toString();';
    prefix += 'var ' + source_origin + ' = document.currentScript !== undefined ? document.currentScript.src : \'\';';
    prefix += '};';


// append the function closing
var postfix = '})();';

// export a Browserify plugin
module.exports = function (browserify, opts) {
    browserify.on("bundle", function(){
        var prefixed = false;
        var sourceMap = '';

        var wrap = through.obj(function(buf, enc, next) {
            if(!prefixed) {
                this.push(prefix);
                prefixed = true;
            }

            var str = buf.toString();

            // find the source map to push to the end of the file, rather than appearing within the function
            var match = str.match('\n//# sourceMappingURL=.*');
            if (match && match.length > 0) {
                sourceMap = match[0];
            }
            else {
                this.push(buf);
            }

            next();
        }, function(next){
            this.push(postfix); // push the function closing
            this.push(sourceMap); // push the source map comment
            next();
        });

        browserify.pipeline.get('wrap').unshift(wrap);
    });
};
