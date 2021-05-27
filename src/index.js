;(function () {
    var regex = {
        username: /^[a-z]+[0-9]*$/i,
        // RFC 2822
        email: /^([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x22([^\x0d\x22\x5c\x80-\xff]|\x5c[\x00-\x7f])*\x22)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x22([^\x0d\x22\x5c\x80-\xff]|\x5c[\x00-\x7f])*\x22))*\x40([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x5b([^\x0d\x5b-\x5d\x80-\xff]|\x5c[\x00-\x7f])*\x5d)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x5b([^\x0d\x5b-\x5d\x80-\xff]|\x5c[\x00-\x7f])*\x5d))*$/,
        numbers: /[0-9]+/,
        tele: /[0-9]+/
    },
    // error messages
    defaultMessages = {
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
    // default validation events
    defaultEvents = ['submit'],
    // default messages language
    defaultLang = 'en',
    // supported validation events
    supportedEvents = ['submit', 'change'],
    // supported constraints types and their default values
    defaultConstraints = {
        required: false,
        match: null,
        maxlength: null,
        equal: null,
        messages: defaultMessages
    };

    var FormValidator = function (form, settings) {
        if (!(this instanceof FormValidator)) {
            return new FormValidator(form, settings);
        }

        if (!settings || typeof settings !== 'object') {
            return;
        }

        if (!(form instanceof Element)) {
            this.form = document.querySelector(form);
        }

        this.lang        = settings.lang || lang;
        this.events      = settings.events && this.initEvents(settings.events);
        this.constraints = settings.constraints && this.initConstraints(settings.constraints);
    };

    FormValidator.prototype = {

        defaults: {
            regex: regex,
            constraints: defaultConstraints,
            events: defaultEvents,
            messages: defaultMessages,
            lang: defaultLang,
        },

        /** 
         * Initializes validation constraints
         * Handles unsupported validation constraints types
         * Handles the built-in HTML validation attributes
         * @param   {Object}
         * @returns {Object}
         */
         initConstraints: function (constraints) {
            var result = {};

            for (var key in constraints) {
                if (!constraints.hasOwnProperty(key)) {
                    continue;
                }

                // detected unsupported validation constraints types and send a warn to the console
                for(var _key in constraints[key]) {
                    if (!constraints[key].hasOwnProperty(_key)
                        || Object.keys(defaultConstraints).indexOf(_key) !== -1) {
                        continue;
                    }

                    console.warn(_key + ' is unsupported validation constraint type.');
                    // delete the invalid constraint type
                    delete constraints[key][_key];
                }

                // ...
                Object.assign(
                    result[key] = {},
                    defaultConstraints,
                    constraints[key]
                );
                
                // handle constraint types that haves a function value
                for (var _key in result[key]) {
                    if (!result[key].hasOwnProperty(_key)) {
                        continue;
                    }

                    var val = result[key][_key];
                    if (typeof val === 'function') {
                        result[key][_key] = val.call(this);
                    }
                }

                // if defined (messages) merge them with the defaults messages
                var messages = constraints[key].messages;
                messages && Object.assign(result[key].messages = {}, defaultMessages[this.lang], messages);

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

        /**
         * Initialize validation events for a FormValidator instance
         * @param   {Array} events 
         * @returns {Array}
         */
        initEvents: function(events) {
            if (!Array.isArray(events) || events.length === 0) {
                return defaultEvents;
            }

            var i = 0, len = events.length, result = [];
            while (i < len) {
                var ev = events[i];
                
                if (supportedEvents.indexOf(ev) !== -1) {
                    result.push(ev); i++;
                    continue;
                }

                console.warn(ev + ' is invalid form validation event.');
                i++;
            }

            return result;
        },
    };

    window.FormValidator = FormValidator;
})();
