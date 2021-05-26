(function () {
    var regex = {
            username: /^[a-z]+[0-9]*$/i,
            // RFC 2822
            email: /^([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x22([^\x0d\x22\x5c\x80-\xff]|\x5c[\x00-\x7f])*\x22)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x22([^\x0d\x22\x5c\x80-\xff]|\x5c[\x00-\x7f])*\x22))*\x40([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x5b([^\x0d\x5b-\x5d\x80-\xff]|\x5c[\x00-\x7f])*\x5d)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x5b([^\x0d\x5b-\x5d\x80-\xff]|\x5c[\x00-\x7f])*\x5d))*$/,
            numbers: /[0-9]+/,
            tele: /[0-9]+/
        },
        // error messages
        messages = {
            en: {
                match: 'Invalid format for {0} field value.',
                required: 'The field {0} is required.',
                max: 'The field {0} must not exceed {1} characters.',
                equal: 'The field {0} not equals the value of field {1}'
            },
            fr: {
                match: 'Le format du champ {0} est incorrect.',
                required: 'Le champ {0} est requis.',
                max: 'Le champ {0} ne doit pas dépasser {1} caractères.',
                equal: 'The field {0} not equals the value of field {1}'
            }
        },
        // supported events
        defaultEvents = ['submit'],
        // showing errors after inputs
        showError = true,
        // Highliting inputs
        inputHighlight = true;
        // default messages language
        lang = 'en',
        // supported constraints and their default values
        (defaultConstraints = {
            required: false,
            match: null,
            maxlength: null,
            equal: null,
            messages: messages
        });

    var FormValidator = function (form, settings) {
        if (!(this instanceof FormValidator)) {
            return new FormValidator(form, settings);
        }

        if (!(form instanceof Element)) {
            this.form = document.querySelector(form);
        }

        if (!settings || typeof settings !== 'object') {
            return;
        }

        this.constraints = settings.constraints && this.initConstraints(settings.constraints);
        this.events      = settings.events || defaultEvents;
        this.lang        = settings.lang || this.lang;
    };

    FormValidator.prototype = {

        /** 
         * Initializes validation constraints
         * Handles unsupported validation constraints
         * Handles the built-in HTML validation attributes
         * @param  {Object}
         * @return {Object}
         */
         initConstraints: function (constraints) {
            var result = {};

            for (var key in constraints) {
                if (!constraints.hasOwnProperty(key)) {
                    continue;
                }

                // detected unsupported validation constraints and send a warn to the console
                for(var _key in constraints[key]) {
                    if (!constraints[key].hasOwnProperty(_key)
                        || Object.keys(defaultConstraints).indexOf(_key) !== -1) {
                        continue;
                    }

                    console.warn(_key + ' is unsupported validation constraint.');
                    delete constraints[key][_key];
                }

                // ...
                Object.assign(
                    result[key] = {},
                    defaultConstraints,
                    constraints[key]
                );

                // check for HTML built-in validation attributes
                var element = this.form[key];
                (attributes = [
                    'required',
                    'minlength',
                    'maxlength',
                    'min',
                    'max',
                    'pattern'
                ]),
                (i = 0);

                var cts = result[key];

                while (i < attributes.length) {
                    var attr = attributes[i];

                    // if the attribute is not an HTML validation attribute move to the next one
                    if (Object.keys(constraints).indexOf(attr) === -1) {
                        break;
                    }

                    switch (attr) {
                        case 'required':
                            cts[attr] = element.getAttribute('required') !== null;
                            break;

                        case 'maxlength':
                            var val = element.getAttribute('maxlength');
                            cts[attr] = val && Number.parseInt(val);
                            break;
                    }

                    // Check for type='email'

                    i++;
                }
            }

            return result;
        },

    
    };

    window.FormValidator = FormValidator;

    var validate = FormValidator('#register_form', {
        events: ['change', 'input'],
        lang: 'fr',
        constraints: {
            username: {
                //required: true,
                match: 'tele',
                maxlength: 30,
                mamak: 'mamak'
            }
        }
    });

    console.log(validate);

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