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
                custom: 'Field value should match the regex pattern {0}',
                email: 'Please enter a valid email address.',
                username: 'Please enter a valid username.',
                number: 'Please enter a valid number.',
                required: 'This field is required.',
                maxlength: 'Please enter at least {0} characters.',
                equal: 'Please enter the same value.',
            },
            // french
            fr: {
                custom: "La valeur du champs doit correspondre à l'expression régulière {0}",
                email: 'Veuillez saisir une adresse e-mail valide.',
                username: "Veuillez saisir un nom d'utilisateur valide.",
                number: 'Veuillez entrer un nombre valide.',
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
        // supported constraints types
        defaultConstraints = ['required', 'match', 'maxlength', 'equal'],
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
        if (!(this instanceof FormValidator)) {
            return new FormValidator(form, settings);
        }

        // The settings object argument is optional and if is defined
        // and  wasn't an object then an empty object returned
        if (!form || settings === null || (typeof settings !== 'undefined' && typeof settings !== 'object')) {
            return {};
        }

        this.form = form instanceof Element ? form : document.querySelector(form);
        this.events = (settings && settings.events && this.initEvents(settings.events)) || defaultEvents;
        this.showErrors = typeof (settings && settings.showErrors) !== 'undefined' ? settings.showErrors : showErrors;
        this.lang = (settings && settings.lang) || defaultLang;
        this.errors = {};

        this.buildConstraints((settings && settings.constraints) || {});

        if (settings) {
            typeof settings.submitHandler === 'function' && (this.submitHandler = settings.submitHandler);
            typeof settings.invalidHandler === 'function' && (this.invalidHandler = settings.invalidHandler);
        }

        // disable built-in browser validation
        this.form.setAttribute('novalidate', 'novalidate');
    };

    FormValidator.prototype = {
        defaults: {
            regex: regex,
            messages: defaultMessages,
            errorElement: errorElement,
            inputErrorBorder: inputErrorBorder,
            // errorElementConfigs: errorElement
        },

        /**
         * Initializes and builds the constraints object that holds all the information needed for validation
         * @param {Object} constraints
         */
        buildConstraints: function (constraints) {
            if (constraints && typeof constraints !== 'object') {
                return;
            }

            this.constraints = {};

            this.processConstraints(constraints);
            this.mergeHTML5Constraints();
            this.setErrorMessages();

            this.bindEvents();
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

                for (var constraintType in constraints[filedName]) {
                    if (
                        constraintType === 'messages' ||
                        !Object.prototype.hasOwnProperty.call(constraints[filedName], constraintType)
                    ) {
                        continue;
                    }

                    var isValidConstraint = true;

                    // detected unsupported validation constraints types and send a warn to the consoles
                    if (defaultConstraints.indexOf(constraintType) === -1) {
                        console.warn("'" + constraintType + "' is unsupported validation constraint type.");
                        isValidConstraint = false;
                    }

                    // handle constraint type value if it defined as a function
                    var constraintValue = constraints[filedName][constraintType];
                    if (typeof constraintValue === 'function') {
                        constraints[filedName][constraintType] = constraintValue.call(this);
                    }

                    !isValidConstraint && delete constraints[filedName][constraintType];
                }

                ref[filedName] = constraints[filedName];
            }
        },

        /**
         * Merge the HTML5 validation attributes and input types constraints with the constraints object
         * @link https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/Constraint_validation
         */
        mergeHTML5Constraints: function () {
            var ref = this.constraints,
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
         * Sets constraints validation error messages for the constraints object
         */
        setErrorMessages: function () {
            var ref = this.constraints;

            for (var fieldName in ref) {
                if (!Object.prototype.hasOwnProperty.call(ref, fieldName)) {
                    continue;
                }

                var constraints = ref[fieldName];

                // initialize the messages object if not defined
                if (typeof constraints.messages === 'undefined') {
                    constraints.messages = {};
                }

                // loop througth all the contraints types to define the error messages for each
                for (var constraintType in constraints) {
                    if (
                        !Object.prototype.hasOwnProperty.call(constraints, constraintType) ||
                        constraintType === 'messages'
                    ) {
                        continue;
                    }

                    var constraintTypeVal = constraints[constraintType],
                        messages = constraints.messages,
                        definedMsg = messages && messages[constraintType],
                        msg = definedMsg;

                    // handle if the message was defined and it was a function
                    if (typeof definedMsg === 'function') {
                        var defaultMsg =
                            this.defaults.messages[this.lang][
                                constraintType === 'match' ? constraintTypeVal : constraintType
                            ];
                        // call the callback function and pass the default message to it
                        msg = definedMsg.call(this, defaultMsg);
                    }
                    // match: /someregex/
                    else if (constraintType === 'match' && constraintTypeVal instanceof RegExp) {
                        msg = this.defaults.messages[this.lang].custom;
                    }
                    // match: regexName
                    else if (constraintType === 'match' && Object.keys(regex).indexOf(constraintTypeVal) !== -1) {
                        msg = this.defaults.messages[this.lang][constraintTypeVal];
                    }
                    // set the default message for all other cases (maxlength, required, equal)
                    else {
                        msg = this.defaults.messages[this.lang][constraintType];
                    }

                    // if the message contains a '{1}' placeholder then replace it with
                    // the actual value of the constraint type
                    if (tokenRegex.test(msg)) {
                        constraintTypeVal =
                            constraintType === 'equal' ? constraintTypeVal.substr(1) : constraintTypeVal;
                        msg = msg.replace(tokenRegex, constraintTypeVal);
                    }

                    ref[fieldName].messages[constraintType] = msg;
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
                }
            );
        },

        /**
         * Validate constraints for a single form element
         */
        element: function (element, constraints) {
            if (typeof constraints === 'object') {
                var newConstraints = {};
                newConstraints[element.name] = constraints;
                this.buildConstraints(newConstraints);
            }

            var elementName = element.name,
                constraints = this.constraints[elementName],
                types = Object.keys(constraints),
                messages = constraints.messages,
                isValid = true;

            // handle required constraint type first
            if (types.indexOf('required') !== -1 && !this.getFieldValue(element)) {
                this.raiseError.apply(this, [elementName, messages.required]);
                // there is no need to continue checking the other constraint since the field value is empty
                return !isValid;
            }

            // handle the other constraint types
            if (this.getFieldValue(element)) {
                types.forEach(
                    function (type) {
                        if (type !== 'required' && type !== 'messages') {
                            if (this.handle.apply(this, [element, type, constraints[type]]) === true) {
                                this.raiseError.apply(this, [elementName, messages[type]]);
                                isValid = false;
                            }
                        }
                    }.bind(this)
                );
            }

            if (isValid === true && this.errors) {
                this.removeError.call(this, elementName);
            }

            return isValid;
        },

        raiseError: function (elementName, message) {
            this.errors[elementName] = message;
            this.showErrors && this.mark(elementName, message);
        },

        removeError: function (elementName) {
            delete this.errors[elementName];
            this.showErrors && this.unmark(elementName);
        },

        handle: function (element, constraintName, constraintValue) {
            var elementValue = this.getFieldValue(element);

            switch (constraintName) {
                case 'maxlength':
                    return elementValue.length >= constraintValue;

                case 'match':
                    regex = constraintValue instanceof RegExp ? constraintValue : this.defaults.regex[constraintValue];
                    return !regex.test(elementValue);

                case 'equal':
                    return elementValue !== this.getFormElements()[constraintValue.substring(1)].value;
            }
        },

        all: function () {
            var elements = this.getElemetsToValidate(),
                isValid = true,
                i = 0;

            while (i < elements.length) {
                if (!this.element.call(this, elements[i])) {
                    isValid = false;
                }
                i++;
            }

            return isValid;
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
            var elements = [],
                constraints = this.constraints;

            for (var fieldName in constraints) {
                if (!Object.prototype.hasOwnProperty.call(constraints, fieldName)) {
                    continue;
                }

                var element = this.form[fieldName];

                if (element.length > 0) {
                    var i = 0;
                    while (i < element.length) {
                        elements.push(element[i]);
                        i++;
                    }
                } else {
                    elements.push(element);
                }
            }

            return elements;
        },

        /**
         * Marks the givig element as invalid
         * @param {DOM Object} element
         * @param {String|Function} error
         */
        mark: function (elementName, error) {
            var element = this.getFormElements()[elementName];

            if (Array.isArray(element)) {
                element = element[element.length - 1];
            }

            // if the span is already added just update just the text inside
            var span = this.getSiblingByClass(element, 'error');
            if (span instanceof Element) {
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
         * Gets all the form elements as an object, for each pair the key
         * is the input name and the value is the actual DOM element
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
         * Simple helper to attaches event handlers to a DOM element/elements
         * 
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

    window.FormValidator = FormValidator;
})();
