(function () {
    var regex = {
            username: /^[a-z]+[0-8]*$/i,
            // RFC 2822
            email: /^([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x22([^\x0d\x22\x5c\x80-\xff]|\x5c[\x00-\x7f])*\x22)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x22([^\x0d\x22\x5c\x80-\xff]|\x5c[\x00-\x7f])*\x22))*\x40([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x5b([^\x0d\x5b-\x5d\x80-\xff]|\x5c[\x00-\x7f])*\x5d)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x5b([^\x0d\x5b-\x5d\x80-\xff]|\x5c[\x00-\x7f])*\x5d))*$/,
            number: /[0-9]+/,
        },
        // error messages
        defaultMessages = {
            en: {
                match: 'Please enter a valid {0}.',
                required: 'This field is required.',
                maxlength: 'Should not exceed {0} characters.',
                equal: 'Not matches field {0}',
            },
            fr: {
                match: 'Le format du champ {0} est incorrect.',
                required: 'Ce champ est requis.',
                maxlength: 'Ce champ ne doit pas dépasser {0} caractères.',
                equal: 'Ne pas égal à champ {0}.',
            },
        },
        // error messages replacing token's regex
        tokenRegex = /\{\d+\}/,
        // default validation events
        defaultEvents = ['submit'],
        // default messages language
        defaultLang = 'en',
        // supported validation events
        supportedEvents = ['submit', 'input', 'change'],
        // supported constraints types and their default values
        defaultConstraints = {
            required: null,
            match: null,
            maxlength: null,
            equal: null,
            messages: defaultMessages,
        },
        // supported HTML5 validation attributes
        html5attributes = [
            'required',
            'maxlength',
            'pattern',
            // 'minlength',
            // 'min',
            // 'max',
        ],
        // HTML5 input types supported
        html5inpuTypes = [
            'email',
            'number',
            // 'url',
        ];

    var FormValidator = function (form, settings) {
        if (!form || (settings && typeof settings !== 'object')) {
            return;
        }

        if (!(this instanceof FormValidator)) {
            return new FormValidator(form, settings);
        }

        this.form = form instanceof Element ? form : document.querySelector(form);
        this.events = (settings && settings.events && this.initEvents(settings.events)) || defaultEvents;
        this.lang = (settings && settings.lang) || defaultLang;

        if (settings) {
            this.buildConstraints(settings.constraints);
            this.submitHandler = typeof settings.submitHandler === 'function' && settings.submitHandler;
            this.invalidHandler = typeof settings.invalidHandler === 'function' && settings.invalidHandler;
        }

        // disable built-in browser validation
        this.form.setAttribute('novalidate', 'novalidate');

        this.bindEvents();
    };

    FormValidator.prototype = {
        defaults: {
            regex: regex,
            constraints: defaultConstraints,
            events: defaultEvents,
            messages: defaultMessages,
            lang: defaultLang,
            submitHandler: function () {},
            invalidHandler: function () {},
        },

        /**
         * Builds and returns an object that holds all the information needed for validation
         * Handles supported built-in HTML validation attributes and input types
         * setting constraints validation error messages
         *
         * @param {Object}
         * @returns {Object}
         */
        buildConstraints: function (constraints) {
            var ref = (this.constraints = {}),
                formElements = this.getFormElements(),
                elemantsNames = formElements.map(function (ele) {
                    return ele.name;
                });

            // handles defining constraints
            for (var filedName in constraints) {
                if (!Object.prototype.hasOwnProperty.call(constraints, filedName)) {
                    continue;
                }

                elemantsNames.indexOf(filedName) === -1 && console.warn(filedName + ' Form Element not found.');

                // detected unsupported validation constraints types and send a warn to the console
                for (var constraintType in constraints[filedName]) {
                    if (
                        !Object.prototype.hasOwnProperty.call(constraints[filedName], constraintType) ||
                        Object.keys(defaultConstraints).indexOf(constraintType) !== -1
                    ) {
                        continue;
                    }

                    console.warn(constraintType + ' is unsupported validation constraint type.');
                    // delete the invalid constraint type
                    delete constraints[filedName][constraintType];
                }

                var value = (ref[filedName] = constraints[filedName]);

                // handle constraint types that haves a function value
                for (var _key in value) {
                    if (!Object.prototype.hasOwnProperty.call(value, _key)) {
                        continue;
                    }

                    var val = value[_key];
                    if (typeof val === 'function') {
                        value[_key] = val.call(this);
                    }
                }
            }

            // handling validation attributes & input types
            for (var key in formElements) {
                if (!Object.prototype.hasOwnProperty.call(formElements, key)) {
                    continue;
                }

                var element = formElements[key],
                    isRadio = element.type && element.type === 'radio',
                    isCheckbox = element.type && element.type === 'checkbox',
                    name = element.name,
                    i = 0;

                // html5 input types
                var eleType = element.type;
                if (eleType && html5inpuTypes.indexOf(eleType) !== -1) {
                    ref[name] = {};
                    ref[name]['match'] = eleType;
                }

                // handles checkbox/radio inputs required attribute
                if (isRadio || isCheckbox) {
                    if (element.required) {
                        ref[name] = {};
                        ref[name].required = true;
                    } else {
                        // check if one of radio/checkbox that haves the same current name has the required attribute
                        for (var _filed in formElements) {
                            if (!Object.prototype.hasOwnProperty.call(formElements, _filed)) {
                                continue;
                            }
                            var ele = formElements[_filed];

                            if (ele.name === element.name && ele.required) {
                                ref[name] = {};
                                ref[name].required = true;
                                break;
                            }
                        }
                    }
                } else {
                    // handles html5 validation attributes
                    while (i < html5attributes.length) {
                        var attr = html5attributes[i];
                        if (!element.hasAttribute(attr)) {
                            i++;
                            continue;
                        }

                        if (!ref[name]) {
                            ref[name] = {};
                        }

                        switch (attr) {
                            case 'required':
                                ref[name][attr] = true;
                                break;

                            case 'maxlength':
                                var val = element.maxLength;
                                ref[name][attr] = val && Number.parseInt(val);
                                break;

                            case 'pattern':
                                ref[name].match = element.pattern;
                                var title = element.title;
                                if (title && title.length > 0) {
                                    if (typeof ref[name].messages === 'undefined') {
                                        ref[name].messages = {};
                                    }
                                    ref[name].messages.match = title;
                                }
                                break;
                        }

                        i++;
                    }
                }
            }

            // setting constraints validation error messages
            for (var key in ref) {
                if (!Object.prototype.hasOwnProperty.call(ref, key)) {
                    continue;
                }

                var constraint = ref[key];

                if (typeof constraint.messages === 'undefined') {
                    constraint.messages = {};
                }

                for (var constraintType in constraint) {
                    if (
                        !Object.prototype.hasOwnProperty.call(constraint, constraintType) ||
                        constraintType === 'messages'
                    ) {
                        continue;
                    }

                    var defaultMsg = defaultMessages[this.lang][constraintType],
                        constraintMsg = constraint.messages[constraintType];

                    if (typeof constraintMsg === 'undefined') {
                        // if constraint deosn't haves a defined message for this constraint type then set the default message
                        constraintMsg = constraint.messages[constraintType] = defaultMsg;
                    } else if (typeof constraintMsg === 'function') {
                        // handlig function values
                        // calling the callback function and pass the default message to it
                        constraint.messages[constraintType] = constraintMsg.call(this, defaultMsg);
                    }

                    // replacing error messages tokens with the actual constraint type value;
                    var tokenValue = constraint[constraintType];
                    if (tokenValue && tokenRegex.test(constraintMsg)) {
                        tokenValue = constraintType === 'equal' ? tokenValue.substr(1) : tokenValue;
                        constraint.messages[constraintType] = constraintMsg.replace(tokenRegex, tokenValue);
                    }
                }
            }
        },

        /**
         * Initialize and returns an array of validation events for a FormValidator instance
         *
         * @param {Array} events
         * @returns {Array}
         */
        initEvents: function (events) {
            if (!Array.isArray(events) || events.length === 0) {
                return defaultEvents;
            }

            var i = 0,
                len = events.length,
                ref = [];

            while (i < len) {
                var ev = events[i];

                if (supportedEvents.indexOf(ev) !== -1) {
                    ref.push(ev);
                    i++;
                    continue;
                }

                console.warn(ev + ' is invalid form validation event.');
                i++;
            }

            return ref;
        },

        /**
         * Binding validation events to an appropriate elements
         */
        bindEvents: function () {
            var events = this.events,
                elements = this.getFormElements(),
                i = 0;

            if (events.indexOf('submit') !== -1) {
                this.bindEvent(this.form, 'submit', function () {
                    console.log('submit');

                    // validate.all()

                    // if validation successed excutes the submit handler if defined
                    this.submitHandler && this.submitHandler.call(this);
                    // if fails
                    this.invalidHandler && this.invalidHandler.call(this);
                });
            }

            while (i < events.length) {
                var event = events[i];

                if (event === 'submit') {
                    i++;
                    continue;
                }

                var self = this;
                elements.forEach(function (ele) {
                    self.bindEvent(ele, event, function () {
                        console.log('....');
                        // validate.element(ele)
                    });
                });

                i++;
            }
        },

        getFormElements: function () {
            var elements = this.form.elements,
                res = [];

            for (var i = 0, element; (element = elements[i++]); ) {
                if (element.type === 'submit') continue;
                res.push(element);
            }

            return res;
        },

        bindEvent: function (target, event, fn) {
            if (target instanceof Element) {
                target.addEventListener(event, fn.bind(this), false);
            } else if (Object.prototype.isPrototypeOf.call(HTMLCollection, target)) {
                Array.from(target).forEach(function (ele) {
                    ele.addEventListener(event, fn.bind(this), false);
                });
            }
        },

        /**
         * Allows adding a custom match type.
         *
         * @param {String} name
         * @param {RegExp|Function} handler
         * @param {String} message
         *
         * @returns {String}
         */
        addMatch: function (name, handler, message) {
            if (typeof name !== 'string' || !handler) {
                return;
            }

            var defaults = this.defaults,
                message = message || '';

            // set match type value
            defaults.regex[name] = handler;
            // set the error message for this match type
            defaults.messages[this.lang][name] = message;

            // send a warning to the console to inform that the match type value was changed
            if (Object.keys(regex).indexOf(name) !== -1) {
                console.warn(name + ' match type value overrided.');
            }

            return name;
        },

        /**
         * Replaces the message string token with the giving value
         *
         * @param {String} message
         * @param {String} value
         * @returns {String}
         */
        format: function (message, value) {
            if (typeof message !== 'string' || typeof value !== 'string') return;
            return message.replace(/\{\d+\}/, value);
        },
    };

    window.FormValidator = FormValidator;
})();
