(function () {
    var regex = {
            username: /^[a-z]+[0-9]*$/i,
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
        // error messages replacing tokens's regex
        tokenRegex = /\{\d+\}/,
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
        if (!(this instanceof FormValidator)) {
            return new FormValidator(form, settings);
        }

        if (!form || !settings || typeof settings !== 'object') {
            return;
        }

        this.form = form instanceof Element ? form : document.querySelector(form);
        this.lang = settings.lang || defaultLang;
        this.events = (settings.events && this.initEvents(settings.events)) || defaultEvents;
        this.constraints = settings.constraints && this.initConstraints(settings.constraints);
        this.submitHandler = typeof settings.submitHandler === 'function' && settings.submitHandler;
        this.invalidHandler = typeof settings.invalidHandler === 'function' && settings.invalidHandler;

        // disable built-in browser validation
        // this.form.setAttribute('novalidate', 'novalidate');

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
         * Initializes validation constraints
         * Handles unsupported validation constraints types
         * Handles the built-in HTML validation attributes & input types
         *
         * @param {Object}
         * @returns {Object}
         */
        initConstraints: function (constraints) {
            if (typeof constraints !== 'object') {
                return;
            }

            var result = {};

            // defining constraints
            for (var filedName in constraints) {
                if (!Object.prototype.hasOwnProperty.call(constraints, filedName)) {
                    continue;
                }

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

                var ref = (result[filedName] = constraints[filedName]);

                // handle constraint types that haves a function value
                for (var _key in ref) {
                    if (!Object.prototype.hasOwnProperty.call(ref, _key)) {
                        continue;
                    }

                    var val = ref[_key];
                    if (typeof val === 'function') {
                        ref[_key] = val.call(this);
                    }
                }
            }

            var fields = this.getFormElements();

            // handling validation attributes & input types
            for (var key in fields) {
                if (!Object.prototype.hasOwnProperty.call(fields, key)) {
                    continue;
                }

                var element = fields[key],
                    isRadio = element.type && element.type === 'radio',
                    isCheckbox = element.type && element.type === 'checkbox',
                    name = element.name,
                    i = 0;

                if (!result[name]) {
                    result[name] = {};
                }

                if ((isRadio || isCheckbox) && !result[name].required) {
                    var inputs = fields.filter(function (ele) {
                        if (ele.name === element.name) {
                            return ele;
                        }
                    });

                    while (i < inputs.length) {
                        var input = inputs[i];

                        if (input.required) {
                            result[name].required = true;
                        }

                        i++;
                    }
                } else if (!isRadio && !isCheckbox) {
                    while (i < html5attributes.length) {
                        var attr = html5attributes[i];
                        if (!element.hasAttribute(attr)) {
                            i++;
                            continue;
                        }

                        switch (attr) {
                            case 'required':
                                result[name][attr] = true;
                                break;

                            case 'maxlength':
                                var val = element.getAttribute('maxlength');
                                result[name][attr] = val && Number.parseInt(val);
                                break;

                            case 'pattern':
                                result[name]['match'] = element.getAttribute('pattern');
                                break;
                        }
                        i++;
                    }
                }

                // html5 input types
                var eleType = element.type;
                if (eleType && html5inpuTypes.indexOf(eleType) !== -1) {
                    result[name]['match'] = eleType;
                }
            }

            // setting constraints validation error messages
            for (var key in result) {
                if (!Object.prototype.hasOwnProperty.call(result, key)) {
                    continue;
                }

                var constraint = result[key];

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

            return result;
        },

        /**
         * Initialize validation events for a FormValidator instance
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
                result = [];

            while (i < len) {
                var ev = events[i];

                if (supportedEvents.indexOf(ev) !== -1) {
                    result.push(ev);
                    i++;
                    continue;
                }

                console.warn(ev + ' is invalid form validation event.');
                i++;
            }

            return result;
        },

        /**
         * Binding validation events to an appropriate elements
         */
        bindEvents: function () {
            var i = 0,
                events = this.events;

            while (i < events.length) {
                var event = events[i];

                if (event === 'submit') {
                    this.bindEvent(this.form, event, function (e) {
                        e.preventDefault();
                        console.log('submitting');
                        // validate all
                    });
                } else {
                    var elements = this.getFormElements();
                    elements.map(
                        function (ele) {
                            this.bindEvent(ele, event, function () {
                                console.log('changes');
                                // validate each element
                            });
                        }.bind(this)
                    );
                }

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
         * Formates a message string
         *
         * @param {String} msg
         * @param {String} value
         * @returns {String}
         */
        format: function (msg, value) {
            return msg.replace(/\{\d+\}/, value);
        },
    };

    window.FormValidator = FormValidator;
})();
