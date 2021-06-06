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
        showErrors = true,
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
        this.showErrors = (settings && settings.showErrors) || showErrors;
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
            showErrors: showErrors,
            submitHandler: function () {},
            invalidHandler: function () {},
        },

        /**
         * Initializes and builds the constraints object that holds all the information needed for validation
         * Handles supported built-in HTML validation attributes and input types
         * Setting constraints validation error messages
         *
         * @param {Object}
         * @returns {Object}
         */
        buildConstraints: function (constraints) {
            var ref = (this.constraints = {}),
                formElements = this.getFormElements(),
                elementsNames = formElements.map(function (ele) {
                    return ele.name;
                });

            // handles the giving constraints object
            for (var filedName in constraints) {
                if (!Object.prototype.hasOwnProperty.call(constraints, filedName)) {
                    continue;
                }

                if (elementsNames.indexOf(filedName) === -1) {
                    console.warn(filedName + ' Form Element not found.');
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

                ref[filedName] = constraints[filedName];
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
                    ref[name] = { match: eleType };
                }

                // handles checkbox/radio inputs required attribute
                if (isRadio || isCheckbox) {
                    if (element.required) {
                        ref[name] = { required: true };
                        continue;
                    }

                    // check if one of the radio/checkbox input that haves the same current name has the required attribute
                    for (var _filed in formElements) {
                        if (!Object.prototype.hasOwnProperty.call(formElements, _filed)) {
                            continue;
                        }
                        var ele = formElements[_filed];
                        if (ele.name === element.name && ele.required) {
                            ref[name] = { required: true };
                            break;
                        }
                    }

                    continue;
                }

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

                    // handle if the match constraint type haves a custom match regex that not defined by the lib
                    var matchName = constraint[constraintType];
                    if (constraintType === 'match' && Object.keys(regex).indexOf(matchName) === -1) {
                        defaultMsg =
                            (this.cutsomMatches &&
                                this.cutsomMatches.messages[this.lang] &&
                                this.cutsomMatches.messages[this.lang][matchName]) ||
                            defaultMsg;
                    }

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
         * Initializes validation events for a FormValidator instance
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

            // bind the form submit event
            if (events.indexOf('submit') !== -1) {
                this.bindEvent(this.form, 'submit', function (e) {
                    e.preventDefault();

                    // validate.all()

                    // if validation successed excutes the submit handler if defined
                    this.submitHandler && this.submitHandler.call(this);
                    // if fails
                    this.invalidHandler && this.invalidHandler.call(this);
                });
            }

            // bind other events to form elements
            while (i < events.length) {
                var event = events[i];

                if (event === 'submit') {
                    i++;
                    continue;
                }

                elements.forEach(
                    function (ele) {
                        this.bindEvent(ele, event, this.element.bind(this, ele));
                    }.bind(this)
                );

                i++;
            }
        },

        /**
         * Validate constraints for a single form element.
         */
        element: function (element, constraints) {
            var name = element.name;

            if (typeof constraints === 'object') {
                var newConstraints = {};
                newConstraints[element] = constraints;
                this.buildConstraints(newConstraints);
            }

            var constraints = this.constraints[name],
                showErrors = (typeof constraints === 'object' && constraints.showErrors === true) || this.showErrors,
                handlers = this.getConstraintsHandlers(constraints),
                i = 0;

            while (i < handlers.length) {
                var handler = handlers[i],
                    error = handler.call(this, element, constraints) || false;

                if (error === false) {
                    //showErrors && context.unmark(ele);
                } else {
                    showErrors && this.mark(element, error);
                }

                i++;
            }
        },

        /**
         * Constraint types handlers.
         */
        handlers: {
            required: function (element, constraints) {
                var isRequired = constraints.required;

                if (isRequired && element.value === '') {
                    return constraints.messages.required;
                }

                return null;
            },
        },

        /**
         * Marks the givig element as invalid
         *
         * @param {DOM Object} element
         * @param {String} error
         */
        mark: function (element, error) {
            if (!(element instanceof Element)) {
                return;
            }

            // if the span is already added just update just the text inside
            var span = this.getSiblingByClass(element, 'error');
            if (span) {
                span.textContent = error;
                return;
            }

            // create the span that shows the error message
            span = document.createElement('span');

            span.style.color = 'red';
            span.style.display = 'block';
            span.classList.add('error');
            span.textContent = error;

            element.style.border = '1px solid red';
            element.parentNode.insertBefore(span, element.nextSibling);
        },

        getSiblingByClass: function (element, className) {
            var parent = element.parentNode,
                childs = parent.childNodes;

            for (var i = 0; i < childs.length; i++) {
                var e = childs[i];
                if (e.nodeType !== 3 && e.classList.contains('error')) {
                    return e;
                }
            }

            return null;
        },

        /**
         * Gets constraint types handlers for the the giving constraints object.
         *
         * @param {Object} constraints
         *
         * @returns {Array}
         */
        getConstraintsHandlers: function (constraints) {
            // TODO
            var handlers = [];

            for (var constraintType in constraints) {
                if (!Object.prototype.hasOwnProperty.call(constraints, constraintType)) {
                    continue;
                }

                var func = this.handlers[constraintType];
                typeof func === 'function' && handlers.push(func);
            }

            return handlers;
        },

        /**
         * Gets form elements to validate.
         *
         * @returns {Array}
         */
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
         * Allows adding a custom match regex.
         *
         * @param {String} name
         * @param {RegExp|Function} handler
         * @param {String} messages
         *
         * @returns {String}
         */
        addMatch: function (name, handler, messages) {
            if (typeof name !== 'string' || !handler) {
                return;
            }

            // attach the custom match regex to the instance object
            var matches = this.cutsomMatches || (this.cutsomMatches = {});
            matches.regex || (matches.regex = {});
            matches.messages || (matches.messages = {});

            // set match type value
            matches.regex[name] = handler;

            // set the error message for this match type
            for (var lang in messages) {
                if (!Object.prototype.hasOwnProperty.call(messages, lang)) {
                    continue;
                }
                matches.messages[lang] || (matches.messages[lang] = {});
                matches.messages[lang][name] = messages[lang];
            }

            // if the regex name already exists send a warning to the console to inform
            // that the regex value was changed
            if (Object.keys(regex).indexOf(name) !== -1) {
                console.warn(name + ' match type regex value overrided.');
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
