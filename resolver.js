if (typeof define !== 'function') { var define = require('amdefine')(module) }

(function (global, define)
{
    define(['require', 'when', './base'], function (require, when, basePlugin)
    {
        var functionParameterRegex = /^function.*?\((.*?)\)/i,
        functionParameter$refRegex = /\/\*.?\$ref(.*?)\*\/(.*)/im,
        functionBody$refRegex = /\/\*.*\$ref(.*?)\*\/.*?this\.(.*?)$/im;

        var analyzeFunctionParameters, analyzeFunctionBody, analyzeFunctionPrototype, analyzeFunction;

        var hasOwn = Object.prototype.hasOwnProperty;

        analyzeFunctionParameters = function (functionContent)
        {
            var allFunctionParameters = functionParameterRegex.exec(functionContent),
                functionParameters = allFunctionParameters && allFunctionParameters[1].split(',');

            if (functionParameters)
            {
                var functionParameterBindingValues = [];
                for (var i = 0, iLen = functionParameters.length; i < iLen; i++)
                {
                    var arg = functionParameters[i].trim();
                    var result = functionParameter$refRegex.exec(arg);
                    if (result)
                    {
                        var explicitBindingValue = result[1].trim(),
                            implicitBindingValue = result[2].trim();

                        if (explicitBindingValue)
                        {
                            functionParameterBindingValues.push({ $ref: explicitBindingValue.replace(':', '').trim() });
                        }
                        else
                        {
                            functionParameterBindingValues.push({ $ref: implicitBindingValue });
                        }
                    }
                    else
                    {
                        functionParameterBindingValues.push(null);
                    }
                }
                return functionParameterBindingValues;
            }

            return [];
        };

        function flatten(array, shallow)
        {
            var result = [];
            if (!array)
            {
                return result;
            }
            var value,
                index = -1,
                length = array.length;

            while (++index < length)
            {
                value = array[index];
                if (isArray(value))
                {
                    push.apply(result, shallow ? value : flatten(value));
                }
                else
                {
                    result.push(value);
                }
            }
            return result;
        }

        analyzeFunctionBody = function (functionBody)
        {
            var splitFunctionBody = _.flatten(functionBody.split(',').map(function (x) { return x.split(';'); }));

            var functionBodyBindingValues = {};
            for (var i = 0, iLen = splitFunctionBody.length; i < iLen; i++)
            {
                var content = splitFunctionBody[i].trim();
                var result = functionBody$refRegex.exec(content);
                if (result)
                {
                    var explicitBindingValue = result[1].trim(),
                        implicitBindingValue = result[2].trim();

                    console.log(explicitBindingValue, implicitBindingValue);

                    if (explicitBindingValue)
                    {
                        functionBodyBindingValues[implicitBindingValue] = explicitBindingValue.replace(':', '').trim();
                    }
                    else
                    {
                        functionBodyBindingValues[implicitBindingValue] = implicitBindingValue;
                    }
                }
            }

            return functionBodyBindingValues;
        };

        analyzeFunctionPrototype = function (functionPrototype)
        {
            var functionPrototypeBindingValues = {};
            for (var i in functionPrototype)
            {
                if (hasOwn.call(functionPrototype, i))
                {
                    var protoItem = functionPrototype[i];
                    if (typeof protoItem === 'string' && protoItem.indexOf('$ref') === 0)
                    {
                        var indexOfColon = protoItem.indexOf(':')
                        if (indexOfColon > -1)
                            functionPrototypeBindingValues[i] = protoItem.substring(indexOfColon + 1).trim();
                        else
                            functionPrototypeBindingValues[i] = i;
                    }
                        // Potentially made recursive, for nested references?
                        // The potential complex dependancies are mind boggling
                    else if (typeof protoItem === 'object' && '$ref' in protoItem)
                    {
                        functionPrototypeBindingValues[i] = protoItem.$ref;
                    }
                }
            }
            return functionPrototypeBindingValues;
        };

        analyzeFunction = function (func)
        {
            if (typeof func === 'function')
            {
                var functionContent = func.toString(),
                    parameterMap = analyzeFunctionParameters(functionContent);

                return {
                    parameters: parameterMap
                };
            }
            return false;
        }

        return {
            analyzeFunction: analyzeFunction
        };
    });
})(this,
    typeof define == 'function'
    // use define for AMD if available
    ? define
    // Browser
    // If no define or module, attach to current context.
    : typeof module != 'undefined'
        ? function(deps, factory) {
            module.exports = factory.apply(this, [require].concat(deps.slice(1).map(function(x) {
                return require(x);
            })));
        }
        : function(deps, factory) {
            this.wire = factory(
                // Fake require()
                function(modules, callback) { callback(modules); },
                // dependencies
                this.when, this.wire_base
            );
        }
);