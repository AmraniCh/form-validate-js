(function () {
    var regex = {
            username: /^[a-z]+[0-8]*$/i,
            // RFC 2822
            email: /^([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x22([^\x0d\x22\x5c\x80-\xff]|\x5c[\x00-\x7f])*\x22)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x22([^\x0d\x22\x5c\x80-\xff]|\x5c[\x00-\x7f])*\x22))*\x40([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x5b([^\x0d\x5b-\x5d\x80-\xff]|\x5c[\x00-\x7f])*\x5d)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x5b([^\x0d\x5b-\x5d\x80-\xff]|\x5c[\x00-\x7f])*\x5d))*$/,
            number: /[0-9]+/,
        },
        // error messages
        defaultMessages = {
            // english
            en: {
                match: {
                    custom: 'Field value should match the regex pattern {0}',
                    email: 'Please enter a valid email address.',
                    username: 'Please enter a valid username.',
                    number: 'Please enter a valid number.',
                },
                required: 'This field is required.',
                maxlength: 'Please enter at least {0} characters.',
                equal: 'Please enter the same value.',
            },
            // french
            fr: {
                match: {
                    custom: "La valeur du champs doit correspondre à l'expression régulière {0}",
                    email: 'Veuillez saisir une adresse e-mail valide.',
                    username: "Veuillez saisir un nom d'utilisateur valide.",
                    number: 'Veuillez entrer un nombre valide.',
                },
                required: 'Ce champ est requis.',
                maxlength: 'Veuillez saisir au moins {0} caractères.',
                equal: 'Veuillez saisir la même valeur.',
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
        ],
        // error message element configs
        errorElement = {
            tagName: 'span',
            css: {
                color: 'red',
                display: 'block',
            },
            classes: ['error'],
        },
        inputErrorBorder = '2px solid red';

    var FormValidator = function (form, settings) {
        if (!form || !settings || typeof settings !== 'object') {
            return;
        }

        if (!(this instanceof FormValidator)) {
            return new FormValidator(form, settings);
        }

        this.form = form instanceof Element ? form : document.querySelector(form);
        this.events = (settings && settings.events && this.initEvents(settings.events)) || defaultEvents;
        this.showErrors = typeof (settings && settings.showErrors) === 'undefined' ? showErrors : settings.showErrors;
        this.lang = (settings && settings.lang) || defaultLang;
        this.constraints = {};
        this.errors = {};

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
        //TODO change the 'defaults' name to 'settings' ?
        defaults: {
            regex: regex,
            events: defaultEvents,
            messages: defaultMessages,
            lang: defaultLang,
            showErrors: showErrors,
            errorElement: errorElement,
            inputErrorBorder: inputErrorBorder,
        },

        /**
         * Initializes and builds the constraints object that holds all the information needed for validation
         * @param {Object} constraints
         */
        buildConstraints: function (constraints) {
            if (constraints && typeof constraints !== 'object') {
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
                    console.warn(
                        "A form element with the name '" +
                            filedName +
                            "' is not found in the form '#" +
                            this.form.id +
                            "'."
                    );
                    continue;
                }

                // detected unsupported validation constraints types and send a warn to the console
                for (var constraintType in constraints[filedName]) {
                    if (!Object.prototype.hasOwnProperty.call(constraints[filedName], constraintType)) {
                        continue;
                    }

                    var isValidConstraint = true;

                    if (fileConstraints.indexOf(constraintType) !== -1 && formElement.type !== 'file') {
                        console.warn(
                            "The '" +
                                formElement.name +
                                "' form element is not of type file, thus the '" +
                                constraintType +
                                "' constraint type is useless."
                        );
                        isValidConstraint = false;
                    }

                    if (Object.keys(defaultConstraints).indexOf(constraintType) === -1) {
                        console.warn("'" + constraintType + "' is unsupported validation constraint type.");
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
                            if (!ref[ele.name]) ref[ele.name] = {};
                            ref[ele.name].required = true;
                        }
                    });
                } else {
                    var name = element.name;

                    // html5 input types
                    var eleType = element.type;
                    if (eleType && html5inpuTypes.indexOf(eleType) !== -1) {
                        if (!ref[name]) ref[name] = {};
                        ref[name].match = eleType;
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
                                ref[name].match = new RegExp(element.pattern);
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

            for (var fieldName in ref) {
                if (!Object.prototype.hasOwnProperty.call(ref, fieldName)) {
                    continue;
                }

                var constraints = ref[fieldName];

                if (typeof constraints.messages === 'undefined') {
                    constraints.messages = {};
                }

                for (var constraintType in constraints) {
                    if (
                        !Object.prototype.hasOwnProperty.call(constraints, constraintType) ||
                        constraintType === 'messages'
                    ) {
                        continue;
                    }

                    var constraintTypeVal = constraints[constraintType],
                        messages = constraints.messages,
                        definedMsg = messages && constraints.messages[constraintType],
                        msg = definedMsg;

                    // set error message for the custom match
                    if (
                        constraintType === 'match' &&
                        typeof constraintTypeVal === 'string' &&
                        Object.keys(regex).indexOf(constraintTypeVal) === -1
                    ) {
                        var customMatches = FormValidator.cutsomMatches,
                            messages = customMatches && customMatches.messages[this.lang],
                            message = messages && messages[constraints.match];

                        constraints.messages['match'] = message || '';
                        continue;
                    }

                    if (!definedMsg) {
                        if (constraintType === 'match') {
                            constraints.messages[constraintType] = defaultMessages[this.lang].match[constraintTypeVal];
                        } else {
                            msg = constraints.messages[constraintType] =
                                this.defaults.messages[this.lang][constraintType];
                        }
                    }

                    if (tokenRegex.test(msg)) {
                        constraintTypeVal =
                            constraintType === 'equal' ? constraintTypeVal.substr(1) : constraintTypeVal;
                        constraints.messages[constraintType] = msg.replace(tokenRegex, constraintTypeVal);
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
            var elementsToValidate = this.getElemetsToValidate(),
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

                if (errorMsg.length > 0) {
                    this.errors[eleName] = errorMsg;
                    showErrors && this.mark(eleName, errorMsg);
                    valid = false;
                }
            }

            if (valid === true) {
                delete this.errors[eleName];
                showErrors && this.unmark(eleName);
            }

            return valid;
        },

        all: function () {
            var elements = this.getElemetsToValidate(),
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
                return constraintVal === true && !this.getFieldValue(element) ? message : '';
            },

            match: function (element, constraintVal, message) {
                var eleVal = this.getFieldValue(element);

                if (eleVal === '') return '';

                // handle the custom matches
                if (
                    !(constraintVal instanceof RegExp) &&
                    typeof constraintVal === 'string' &&
                    Object.keys(this.defaults.regex).indexOf(constraintVal) === -1
                ) {
                    var matches = FormValidator.cutsomMatches,
                        handler = matches && matches.regex[constraintVal];

                    if (
                        (typeof handler === 'function' && !handler.apply(FormValidator, [eleVal, element])) ||
                        (handler instanceof RegExp && !handler.test(eleVal))
                    ) {
                        return matches.messages[this.lang][constraintVal];
                    }

                    return !handler;
                }

                var regex = constraintVal instanceof RegExp ? constraintVal : this.defaults.regex[constraintVal];
                return eleVal !== '' && !regex.test(eleVal) ? message : '';
            },

            maxlength: function (element, constraintVal, message) {
                var eleVal = this.getFieldValue(element);
                return eleVal !== '' && eleVal.length >= constraintVal ? message : '';
            },

            equal: function (element, constraintVal, message) {
                var eleVal = this.getFieldValue(element),
                    equalValue = this.getFormElements()[constraintVal.substring(1)].value;
                return eleVal !== '' && eleVal !== equalValue ? message : '';
            },
        },

        /**
         * Gets the correct field form value
         * @param {String} element
         */
        getFieldValue: function (element) {
            if (element.type === 'checkbox' || element.type === 'radio') {
                var value,
                    choices = this.getFormElements()[element.name];

                choices.forEach(function (ele) {
                    if (ele.checked === true) {
                        value = ele.value;
                    }
                });

                return value;
            }

            return element.value;
        },

        /**
         * Gets only the defined form elements in the constraints object to be validated
         * @returns Array<DOM Element>
         */
        getElemetsToValidate: function () {
            var res = [],
                elements = this.getFormElements();

            for (var field in elements) {
                if (!Object.prototype.hasOwnProperty.call(elements, field)) {
                    continue;
                }

                var ele = elements[field];

                if (Array.isArray(ele)) {
                    var isDefined = Object.keys(this.constraints).indexOf(ele[0].name) !== -1 ? true : false;
                    isDefined &&
                        ele.forEach(function (current) {
                            res.push(current);
                        });
                }

                if (ele instanceof Element) {
                    var isDefined = Object.keys(this.constraints).indexOf(ele.name) !== -1 ? true : false;
                    isDefined && res.push(ele);
                }
            }

            return res;
        },

        /**
         * Marks the givig element as invalid
         * @param {DOM Object} element
         * @param {String} error
         */
        mark: function (elementName, error) {
            var element = this.getFormElements()[elementName];

            if (Array.isArray(element)) {
                element = element[element.length - 1];
            }

            // if the span is already added just update just the text inside
            var span = this.getSiblingByClass(element, 'error');
            if (span) {
                span.textContent = error;
                return;
            }

            // create the span that shows the error message
            var elementConfigs = this.defaults.errorElement;

            span = document.createElement(elementConfigs.tagName);

            elementConfigs.classes.forEach(function (className) {
                span.classList.add(className);
            });

            var styles = elementConfigs.css;
            for (var prop in styles) {
                var val = styles[prop];
                span.style[prop] = val;
            }

            span.textContent = error;

            var border = this.defaults.inputErrorBorder;
            border && (element.style.border = border);

            element.parentNode.appendChild(span);
        },

        /**
         * Unmark invalid form element
         * @param {DOM Object} element
         */
        unmark: function (elementName) {
            var element = this.getFormElements()[elementName];

            if (Array.isArray(element)) {
                element.forEach(
                    function (ele) {
                        removeErrorFromElement.call(this, ele);
                    }.bind(this)
                );
            } else {
                removeErrorFromElement.call(this, element);
            }

            function removeErrorFromElement(ele) {
                var span = this.getSiblingByClass(ele, 'error');
                if (span instanceof Element) {
                    span.remove();
                    // TODO revert to origin style
                    ele.style.border = '1px solid #999';
                }
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
         * Gets all form elements as an object, for each pair the key
         * is the input name and the value is the actual input DOM element
         * @returns {Object}
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
