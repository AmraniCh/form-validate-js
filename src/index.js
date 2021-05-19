(function(global) {

    var func = function(formSelector, constraints) {
        var form = document.forms[formSelector];

        if (!(this instanceof func)) {
            return new func(formSelector, constraints);
        }

        if (typeof form === 'undefined') {
            return false;
        }

        /**
         * Define Constraints constants.
         */    
         var 
            REQUIRED = 'required',
            MATCH    = 'match',
            MAX      = 'max',
            MIN      = 'min',
            TYPE     = 'type';
            // TODO add pattern

        /**
         * Define built-in form validation attributes constaints.
         */
        var 
            BROWSER_REQUIRED = 'required',
            BROWSER_MINLENGTH = 'minlength',
            BROWSER_MAXLENGTH = 'maxlength';

        this.form = form;
        this.constraints = constraints;
    
        // disable browser built-in validation
        form.setAttribute('novalidate', 'novalidate');

        // prevent form submitting
        preventSubmit();

        // add submit handler and start the validation process
        form.addEventListener('submit', function() {
            validate();
        });

        //var proto = func.prototype;

        function validate() {
            // getting all form fileds
            var fields = this.fields = form.querySelectorAll('input:not([type=submit]), select');

            if (fields.length < 0) {
                return false;
            }

            for (var key in fields) {
                if (fields.hasOwnProperty(key)) {
                    var field = fields[key],
                        fieldName = field.name,
                        constraints = getFieldAttributeConstraints(field),
                        i = 0, len = constraints.length;
        
                    while(i < len) {
                        var constraint = constraints[i];
                            constraintName = constraint.name;
                            //constraintValue = constraint.value;
            
                        switch(name) {
                            case BROWSER_REQUIRED: 
                                var message = getFieldConstraintValue(fieldName, REQUIRED) || 'This field is required.';
                                requiredHandler(fieldName, message); break;
                        }
                            
                        i++;    
                    }

                    /*
                    if (typeof constraints === 'object' && typeof constraints[name] === 'object'&& constraints[name].hasOwnProperty('required')) {
                        this.requiredHandler(name, constraints[name].required);
                    }*/
                }
            }
        };

        function preventSubmit() {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
            })
        };
        
        function requiredHandler(filedname, message) {
            element = form[filedname];
            element.insertAdjacentHTML('afterEnd', '<span style="color:red;">'+message+'</span>');
            element.style.border = '1px solid red';
        };

        function showError(filedname, message) {
            
        }

        function getFieldAttributeConstraints(filedElement) {
            arr = [REQUIRED, MATCH, MAX],
            attributes = filedElement.attributes,
            results = [];

            for (var i = 0; i < attributes.length; i++) {
                var attr = attributes[i].name;
                if (arr.indexOf(attr) >= 0) {
                        results.push({name: attr, value: attributes[i].value});
                }
            } 
            
            return results;
        };

        function getFieldConstraintValue(fieldname, constrantName) {
            return constraints[fieldname][constrantName];
        }
    };

    global.FormValidateJS = func;

})(window);
