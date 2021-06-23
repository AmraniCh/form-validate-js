// TODO error list
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
                extensions: 'File extension must be {0}.',
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
            extensions: null,
            size: null,
            messages: defaultMessages,
        },
        // constraints for file inputs
        fileConstraints = ['extensions', 'size'],
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
        this.showErrors = typeof (settings && settings.showErrors) === 'undefined' ? showErrors : settings.showErrors;
        this.lang = (settings && settings.lang) || defaultLang;
        this.errors = {};
        this.constraints = {};

        if (settings) {
            this.buildConstraints(settings.constraints);
            typeof settings.submitHandler === 'function' && (this.submitHandler = settings.submitHandler);
            typeof settings.invalidHandler === 'function' && (this.invalidHandler = settings.invalidHandler);
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
        },

        /**
         * Initializes and builds the constraints object that holds all the information needed for validation
         * @param {Object} constraints
         */
        buildConstraints: function (constraints) {
            if (typeof constraints !== 'object') {
                return;
            }

            this.processConstraints(constraints);
            this.mergeHTML5Constraints(this.constraints);
            this.setErrorMessages(this.constraints);
        },

        /**
         * Process the giving constraints object to respect the default constraints defined by the library
         * @param {Object} constraints
         */
        processConstraints: function (constraints) {
            var ref = this.constraints,
                formElements = this.getFormElements();

            for (var filedName in constraints) {
                if (!Object.prototype.hasOwnProperty.call(constraints, filedName)) {
                    continue;
                }

                var formElement = formElements[filedName];

                if (!formElement) {
                    console.warn(filedName + ' Form Element not found.');
                    continue;
                }

                // detected unsupported validation constraints types and send a warn to the console
                var isValidConstraint = true;
                for (var constraintType in constraints[filedName]) {
                    if (!Object.prototype.hasOwnProperty.call(constraints[filedName], constraintType)) {
                        continue;
                    }

                    if (fileConstraints.indexOf(constraintType) !== -1 && formElement.type !== 'file') {
                        console.warn(
                            formElement.name +
                                ' form element is not of type file, thus the ' +
                                constraintType +
                                ' constraint type does nothing.'
                        );
                        isValidConstraint = false;
                    }

                    if (Object.keys(defaultConstraints).indexOf(constraintType) === -1) {
                        console.warn(constraintType + ' is unsupported validation constraint type.');
                        isValidConstraint = false;
                    }

                    !isValidConstraint && delete constraints[filedName][constraintType];
                }

                ref[filedName] = constraints[filedName];
            }
        },

        /**
         * Merges HTML validation attributes & input types constraints with the giving constraints object
         * @param {Object} constraints
         */
        mergeHTML5Constraints: function (constraints) {
            var ref = constraints,
                formElements = this.getFormElements();

            for (var key in formElements) {
                if (!Object.prototype.hasOwnProperty.call(formElements, key)) {
                    continue;
                }

                var element = formElements[key],
                    i = 0;

                // handles checkbox/radio inputs required attribute
                if (Array.isArray(element)) {
                    var firstElement = element[0];
                    element.forEach(function (ele) {
                        if (ele.name === firstElement.name && ele.required) {
                            ref[ele.name] = { required: true };
                        }
                    });
                } else {
                    var name = element.name;

                    // html5 input types
                    var eleType = element.type;
                    if (eleType && html5inpuTypes.indexOf(eleType) !== -1) {
                        ref[element.name] = { match: eleType };
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
            }
        },

        /**
         * Sets constraints validation error messages for the giving constraints object
         * @param {Object} constraints
         */
        setErrorMessages: function (constraints) {
            var ref = constraints;

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

                    // set error message for the custom match
                    var matchName = constraintType === 'match' && constraint[constraintType];
                    if (Object.keys(regex).indexOf(matchName) === -1) {
                        var customMatches = FormValidator.cutsomMatches,
                            messages = customMatches.messages[this.lang],
                            message = messages && messages[constraint.match];

                        constraint.messages['match'] = message || '';
                    }

                    var constraintMsg = constraint.messages[constraintType],
                        defaultMsg = defaultMessages[this.lang][constraintType];

                    // if the constraint has an empty error message then sets the default message
                    if (constraintMsg === '') {
                        constraintMsg = constraint.messages[constraintType] = defaultMsg;
                    } else if (typeof constraintMsg === 'function') {
                        /**
                         * handlig function values
                         * calling the callback function and pass the default message to it
                         */
                        constraint.messages[constraintType] = constraintMsg.call(this, defaultMsg);
                    }

                    // replacing error messages tokens with the actual constraint type value;
                    var valule = constraint[constraintType];
                    if (valule && tokenRegex.test(constraintMsg)) {
                        valule = constraintType === 'equal' ? valule.substr(1) : valule;
                        constraint.messages[constraintType] = constraintMsg.replace(tokenRegex, valule);
                    }
                }
            }
        },

        /**
         * Initializes validation events for a FormValidator instance
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
            var events = this.events;

            // bind the form submit event
            if (events.indexOf('submit') !== -1) {
                this.addEvent(this.form, 'submit', function (e) {
                    // prevent default submit action
                    e.preventDefault();
                    var args = [this.form, e];
                    if (this.all() === true) {
                        // if validation successed excutes the submit handler if defined
                        this.submitHandler ? this.submitHandler.apply(this, args) : this.form.submit();
                    } else {
                        // if fails
                        this.invalidHandler && this.invalidHandler.apply(this, args);
                    }
                });
            }

            // bind the other events to form fileds
            var elementsToValidate = this.getFiledsToValidate(),
                events = events.filter(function (ev) {
                    if (ev !== 'submit') {
                        return ev;
                    }
                });

            this.addEvent(
                elementsToValidate,
                events,
                function (element) {
                    this.element.call(this, element);
                }.bind(this)
            );
        },

        /**
         * Validate constraints for a single form element
         */
        element: function (element, constraints) {
            if (typeof constraints === 'object') {
                var newConstraints = {};
                newConstraints[element] = constraints;
                this.buildConstraints(newConstraints);
            }

            var eleName = element.name,
                constraints = this.constraints[eleName],
                handlers = this.getConstraintsHandlers(constraints),
                showErrors = this.showErrors,
                valid = true;

            for (var handlerName in handlers) {
                if (!Object.prototype.hasOwnProperty.call(handlers, handlerName)) {
                    continue;
                }

                var handler = handlers[handlerName],
                    errorMsg = handler.apply(this, [
                        element,
                        constraints[handlerName],
                        constraints.messages[handlerName],
                    ]);

                // console.log(errorMsg);

                if (errorMsg.length > 0) {
                    this.errors[eleName] = errorMsg;
                    showErrors && this.mark(element, errorMsg);
                    valid = false;
                }
            }

            if (valid === true) {
                delete this.errors[eleName];
                showErrors && this.unmark(element);
            }

            return valid;
        },

        all: function () {
            var elements = this.getFiledsToValidate(),
                valid = true,
                i = 0;

            while (i < elements.length) {
                if (!this.element.call(this, elements[i])) {
                    valid = false;
                }
                i++;
            }

            return valid;
        },

        isValid: function () {
            if (this.showErrors) {
                this.showErrors = false;
                try {
                    return this.all();
                } finally {
                    this.showErrors = true;
                }
            }

            return this.all();
        },

        /**
         * Constraint types handlers
         */
        handlers: {
            /**
             * required contraint type handler
             */
            required: function (element, constraintVal, message) {
                return constraintVal === true && !this.getFieldValue(element.name) ? message : '';
            },

            match: function (element, constraintVal, message) {
                var eleVal = this.getFieldValue(element.name);

                if (eleVal === '') {
                    return false;
                }

                // handle the custom matches
                if (
                    !(constraintVal instanceof RegExp) &&
                    typeof constraintVal === 'string' &&
                    Object.keys(regex).indexOf(constraintVal) === -1
                ) {
                    var matches = FormValidator.cutsomMatches,
                        handler = matches.regex[constraintVal];

                    if (
                        (typeof handler === 'function' && !handler.apply(FormValidator, [eleVal, element])) ||
                        (handler instanceof RegExp && !handler.test(eleVal))
                    ) {
                        return matches.messages[this.lang][constraintVal];
                    }

                    return !handler;
                }

                return eleVal !== '' && !regex[constraintVal].test(eleVal) ? message : '';
            },

            maxlength: function (element, constraintVal, message) {
                var eleVal = this.getFieldValue(element.name);
                return eleVal !== '' && eleVal.length >= constraintVal ? message : '';
            },

            equal: function (element, constraintVal, message) {
                var eleVal = this.getFieldValue(element.name),
                    equalValue = this.getFormElements()[constraintVal.substring(1)].value;
                return eleVal !== '' && eleVal !== equalValue ? message : '';
            },
        },

        /**
         * Gets the correct field form value
         * @param {String} fieldName
         */
        getFieldValue: function (fieldName) {
            var field = this.getFormElements()[fieldName];

            if (!field) return;

            if (Array.isArray(field)) {
                var value;

                field.forEach(function (ele) {
                    if (ele.checked === true) {
                        value = ele.value;
                    }
                });

                return value;
            }

            return field.value;
        },

        /**
         * Gets form fields elements to validates
         * @returns Array<Sting>
         */
        getFiledsToValidate: function () {
            var res = [],
                fields = this.getFormElements();

            for (var field in fields) {
                if (!Object.prototype.hasOwnProperty.call(fields, field)) {
                    continue;
                }

                var current = fields[field];

                if (Array.isArray(current) && Object.keys(this.constraints).indexOf(current[0].name) !== -1) {
                    current.forEach(function (_field) {
                        res.push(_field);
                    });
                } else {
                    if (Object.keys(this.constraints).indexOf(current.name) !== -1) {
                        res.push(current);
                    }
                }
            }

            return res;
        },

        /**
         * Marks the givig element as invalid
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

            element.parentNode.appendChild(span);
        },

        /**
         * Unmark the giving invalid form element
         * @param {DOM Object} element
         */
        unmark: function (element) {
            var span = this.getSiblingByClass(element, 'error');
            if (span instanceof Element) {
                span.remove();
                // TODO revert to origin style
                element.style.border = '1px solid #999';
            }
        },

        /**
         * @param {DOM Object} element
         * @param {String} className
         * @returns {DOM Object|null}
         */
        getSiblingByClass: function (element, className) {
            var parent = element.parentNode,
                childs = parent.childNodes;

            for (var i = 0; i < childs.length; i++) {
                var e = childs[i];
                if (e.nodeType !== 3 && e.classList.contains(className)) {
                    return e;
                }
            }

            return null;
        },

        /**
         * Gets constraint types handlers for the giving constraints object
         * @param {Object} constraints
         * @returns {Array}
         */
        getConstraintsHandlers: function (constraints) {
            var handlers = {};

            for (var constraintType in constraints) {
                if (!Object.prototype.hasOwnProperty.call(constraints, constraintType)) {
                    continue;
                }

                var func = this.handlers[constraintType];
                typeof func === 'function' && (handlers[constraintType] = func);
            }

            return handlers;
        },

        /**
         * Gets all form elements indexed with their names
         * @returns {Array}
         */
        getFormElements: function () {
            var elements = this.form.elements,
                res = {};

            for (var i = 0, element; (element = elements[i++]); ) {
                if (element.type === 'submit' && !element.name) continue;

                var val = res[element.name];
                if (element.type === 'radio' || element.type === 'checkbox') {
                    if (!val) {
                        res[element.name] = [];
                    }
                    res[element.name].push(element);
                } else {
                    res[element.name] = element;
                }
            }

            return res;
        },

        /**
         * @param {DOM Object|Array<DOM Object>} target
         * @param {String|Array<String>} events
         * @param {Function} callback
         */
        addEvent: function (target, events, callback) {
            if (typeof events === 'string') {
                var arr = [];
                arr.push(events);
                events = arr;
            }

            var self = this;

            if (target instanceof Element) {
                events.forEach(function (ev) {
                    target.addEventListener(ev, callback.bind(self), false);
                });
            } else if (Array.isArray(target)) {
                events.forEach(function (ev) {
                    target.forEach(function (element) {
                        element.addEventListener(ev, callback.bind(self, element), false);
                    });
                });
            }
        },

        /**
         * Replaces the message string token with the giving value
         * @param {String} message
         * @param {String} value
         * @returns {String}
         */
        format: function (message, value) {
            if (typeof message !== 'string' || typeof value !== 'string') return;
            return message.replace(tokenRegex, value);
        },
    };

    /**
     * Allows adding a custom match regex
     * @param {String} name
     * @param {RegExp|Function} handler
     * @param {String} messages
     * @returns {String}
     */
    FormValidator.addMatch = function (name, handler, messages) {
        if (typeof name !== 'string' || !handler) {
            return;
        }

        var matches = FormValidator.cutsomMatches || (FormValidator.cutsomMatches = {});
        matches.regex || (matches.regex = {});
        matches.messages || (matches.messages = {});

        // set match value
        matches.regex[name] = handler;

        // set the error message for this match
        for (var lang in messages) {
            if (!Object.prototype.hasOwnProperty.call(messages, lang)) {
                continue;
            }
            matches.messages[lang] || (matches.messages[lang] = {});
            matches.messages[lang][name] = messages[lang];
        }

        return name;
    };

    window.FormValidator = FormValidator;
})();
