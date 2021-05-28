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
            match: 'Please enter a valid {0}.',
            required: 'This field is required.',
            maxlength: 'Should not exceed {0} characters.',
            equal: 'Field not matches {0}'
        },
        fr: {
            match: 'Le format du champ {0} est incorrect.',
            required: 'Le champ {0} est requis.',
            maxlength: 'Le champ {0} ne doit pas dépasser {1} caractères.',
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
        required: null,
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

        this.lang           = settings.lang || defaultLang;
        this.events         = settings.events && this.initEvents(settings.events);
        this.constraints    = settings.constraints && this.initConstraints(settings.constraints);
        this.submitHandler  = typeof settings.submitHandler === 'function' && settings.submitHandler;
        this.invalidHandler = typeof settings.invalidHandler === 'function' && settings.invalidHandler;
    };

    FormValidator.prototype = {

        defaults: {
            regex: regex,
            constraints: defaultConstraints,
            events: defaultEvents,
            messages: defaultMessages,
            lang: defaultLang,
            submitHandler: function() {},
            invalidHandler: function() {},
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

                ref = result[key] = {};

                // ...
                Object.assign(
                    ref,
                    defaultConstraints,
                    constraints[key]
                );
                
                // handle constraint types that haves a function value
                for (var _key in ref) {
                    if (!ref.hasOwnProperty(_key)) {
                        continue;
                    }

                    var val = ref[_key];
                    if (typeof val === 'function') {
                        ref[_key] = val.call(this);
                    }
                }

                // HTML built-in validation attributes && input types
                var element = this.form[key],
                    attributes = [
                        'required',
                        'maxlength',
                        //'minlength',
                        //'min',
                        //'max',
                        //'pattern'
                    ],
                    types = [
                        'email',
                        //'url',
                        //number
                    ],
                    i = 0;

                // validation attributes
                while(i < attributes.length) {
                    var attr = attributes[i]; 
                    if (!element.hasAttribute(attr) 
                        || Object.keys(defaultConstraints).indexOf(attr) === -1) {
                        i++; continue;
                    }

                    switch (attr) {
                        case 'required': 
                            ref[attr] = true;
                            break;

                        case 'maxlength':
                            var val = element.getAttribute('maxlength');
                            ref[attr] = val && Number.parseInt(val);
                            break;
                    }

                    i++;
                }

                // input types
                i = 0;
                while(i < types.length) {
                    var type = types[i];
                    if (!element.hasAttribute('type') 
                        || types.indexOf(type) === -1) {
                        i++; continue;
                    }

                    switch (type) {
                        case 'email': 
                            ref.match = 'email';
                            break;
                    }

                    i++;
                }

                var messages = constraints[key].messages;
                // if there is no validation messages specified set the defaults
                if (Object.keys(messages).length === 0) {
                    for(var _key in constraints[key]) {
                        if (!constraints[key].hasOwnProperty(_key)) {
                            continue;
                        }

                        var val = ref[_key], 
                            reg = /\{\d+\}/,
                            defaultMsg = defaultMessages[this.lang][_key];

                        if (reg.test(defaultMsg)) {
                            ref.messages[_key] = defaultMsg.replace(reg, val);
                        }
                    }
                } else if (messages && typeof messages === 'object') {
                    // merge messages object with the defaults ones 
                    Object.assign(ref.messages = {}, defaultMessages[this.lang], messages);

                    for (var _key in ref.messages) {
                        if (!messages.hasOwnProperty(_key)) {
                            continue;
                        }

                        var val = messages[_key], reg = /\{\d+\}/;
                        
                        // handlig function values
                        if (typeof val === 'function') {
                            // calling the callback function and pass the default message to it
                            ref.messages[_key] = val.call(this, defaultMessages[this.lang][_key]);
                            continue;
                        }
                        
                        if (reg.test(val)) {
                            ref.messages[_key] = val.replace(reg, ref[_key]);
                        }
                    }
                } else if (messages && typeof messages ==='string') {
                    // single message specified for a form element
                    ref.messages = messages;
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

        /**
         * @param {String} msg 
         * @param {String} value 
         * @returns 
         */
        format: function(msg, value) {
            return msg.replace(/\{\d+\}/, value);
        },
    };

    window.FormValidator = FormValidator;
})();
