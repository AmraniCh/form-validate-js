;(function() {

    var regex = {
            username: /^[a-z]+[0-9]*$/i,
            // RFC 2822
            email: /^([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x22([^\x0d\x22\x5c\x80-\xff]|\x5c[\x00-\x7f])*\x22)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x22([^\x0d\x22\x5c\x80-\xff]|\x5c[\x00-\x7f])*\x22))*\x40([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x5b([^\x0d\x5b-\x5d\x80-\xff]|\x5c[\x00-\x7f])*\x5d)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x5b([^\x0d\x5b-\x5d\x80-\xff]|\x5c[\x00-\x7f])*\x5d))*$/,
            numbers: /[0-9]+/,
            tele: /[0-9]+/,
        },
    
        // error messages
        messages = {
            en: {
                match: 'Invalid format for {0} field value.',
                required: 'The field {0} is required.',
                max: 'The field {0} must not exceed {1} characters.',
                equal: 'The field {0} not equals the value of field {1}',
            },
            fr: {
                match: 'Le format du champ {0} est incorrect.',
                required: 'Le champ {0} est requis.',
                max: 'Le champ {0} ne doit pas dépasser {1} caractères.',
                equal: 'The field {0} not equals the value of field {1}',
            }
        },
        
        // supported events
        supportedEvents = ['change', 'submit'],

        // showing errors after inputs
        showError = true,

        inputHighlight = true;

        // default messages language
        lang = 'en',

        // supported constraints and their default values
        constraints = {
            required: false,
            match: null,
            maxlength: null,
            equal: null,
        };

    var FormValidator = function(form, options) {
        if (!(this instanceof FormValidator)) {
            return new FormValidator(form, options);
        }

        if (!(form instanceof Element)) {
            this.form = document.querySelector(form) || document.forms[0];
        }

        // Build constraints options
        var fields = this.form.querySelectorAll('input:not([type=submit]), select');

        if (fields.length < 0) {
            return false;
        }

        this.constraints = {};

        for (var key in fields) {
            if (!fields.hasOwnProperty(key)) {
                continue;
            }
            
            var field = fields[key], optscts = options.constraints[field.name];

            var cts = this.constraints[field.name] = {}
                
            // If field contraints are already given
            if (field.name && options && options.constraints && optscts) {
                Object.assign(this.constraints[field.name], constraints, optscts);
            } else {
                // check for HTML built-in validation attributes
                var attributes = ['required', 'minlength', 'maxlength', 'min', 'max', 'pattern'], i = 0;

                while(i < attributes.length) {
                    var attr = attributes[i];

                    // if the alternative constraint is not supported move to the next attribute
                    if (Object.keys(constraints).indexOf(attr) === -1) {
                        console.log(attr);
                        i++;
                    }
                    
                    switch(attr) {
                        case 'required':
                            cts[attr] = field.getAttribute('required') !== null;
                            break;

                        case 'maxlength':
                            var val = field.getAttribute('maxlength');
                            cts[attr] = val && Number.parseInt(val);
                            break;

                        case 'pattern':
                            var val = field.getAttribute('pattern');
                            cts[attr] = val && Number.parseInt(val);
                            break;
                    };

                    i++;
                }

                // Check for type='email'
            }
        }
    };

    FormValidator.prototype = {

        getElementAttributes: function(element, attribute) {
            var attributes = element.attributes,
                results = {};

            for (var i = 0; i < attributes.length; i++) {
                var attr = attributes[i].name;
                if (attr === attribute) {
                    results[attr] = true;
                }
            } 
            
            return results;
        }

    };
    
    window.FormValidator = FormValidator;

    console.log(FormValidator('#register_form', {
        events: ['change', 'input'],
        constraints: {
            username: {
                required: true,
                match: "tele",
                max: 30
            },
        }
    }));

})();


/*
// validate all form inputs
FormValidator("#register_form", {
    events: ['change', 'input'],
    lang: 'fr',
    showError: false,
    submitHandler: function() {
        alert('submitting...');
    },
    constraints: {
        username: {
            required: true,
            match: "tele",
            maxlength: 30,
            messages: {
                required: "Please enter the username!",
                match: "Please enter a valid username."
            }
        },
    }
});

// Validate single form element
var validator = FormValidator("#register_form", {
    events: ['change', 'input'],
    lang: 'fr',
    showError: false
});

validator.single(document.querySelector('#zip'), {
    constraints: {
        required: function() {
            // logic
            return true;
        },
        match: 'zip',
    },
    // handler fires when the validation fails
    invalidHandler: function() {
        alert('invalidZip');
    }
});
*/