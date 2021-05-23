/* eslint-disable no-prototype-builtins */
/* eslint-disable object-shorthand */
;(function() {

    var regex = {
        username: /^[a-z]+[0-9]*$/i,
        email: /^([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x22([^\x0d\x22\x5c\x80-\xff]|\x5c[\x00-\x7f])*\x22)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x22([^\x0d\x22\x5c\x80-\xff]|\x5c[\x00-\x7f])*\x22))*\x40([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x5b([^\x0d\x5b-\x5d\x80-\xff]|\x5c[\x00-\x7f])*\x5d)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x5b([^\x0d\x5b-\x5d\x80-\xff]|\x5c[\x00-\x7f])*\x5d))*$/,
        numbers: /[0-9]+/,
    };

    var messages = {
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
    };

    var events = ['change', 'submit'];

    var defaults = {
        form: document.forms[0],
        constraints: {},
        events: ['submit'],
        lang: 'en',
    };

	var FormValidator = function(options) {
        if (!(this instanceof FormValidator)) {
            return new FormValidator(options);
        }

        if (!options || (options && !options.form)) {
            this.form = defaults.form;
        }

        if (!(options.form instanceof Element)) {
            this.form = document.querySelector(options.form);
        }

        this.constraints = options.constraints || {};
        this.lang = options && options.lang && messages[options.lang] && options.lang || defaults.lang;
        this.events = defaults.events;

        if (options.events) {
            this.events = [];
            var i = 0, len = options.events.length;
            while (i < len) {
                var e = options.events[i];
                if (events.indexOf(e) !== -1) {
                    this.events.push(e);
                }
                i++;
            }
        }

        this.bindEvents();
    };

    FormValidator.prototype = {

        defaults: defaults,

        messages: messages,

        regex: regex,

        bindEvents: function() {
            var self = this;
            this.events.forEach(function(event) {
                switch(event) {
                    case 'submit':
                        self.bindEvent('submit', self.form, function(e) {
                            e.preventDefault();
                            self.validateAll(self.form);
                        }); break;
                    case 'change':
                        self.mapOverFileds(function(field) {
                            self.bindEvent('change', field, function() {
                                self.validate(field);
                            });
                        });
                        break;
                }
            });
        },

        bindEvent: function(event, elements, fn) {
            // checks if 'elements' is a selector
            if (typeof elements === 'string') {
                elements = document.querySelectorAll(elements);
            }
        
            if (Node.prototype.isPrototypeOf(elements)) {
                elements.addEventListener(event, fn);
            }
        
            if (HTMLCollection.prototype.isPrototypeOf(elements)) {
                Array.from(elements).forEach(function (ele) {
                    ele.addEventListener(event, fn);
                });
            }
        
            if (NodeList.prototype.isPrototypeOf(elements)) {
                elements.forEach(function (ele) {
                    ele.addEventListener(event, fn);
                });
            }
        },

        validateAll: function() {
            this.mapOverFileds(function(field) {
                this.validate(field);
            }.bind(this));
        },

        validate: function(fieldElement) {     
            var handlers = [
                //equalHandler,
                this.requiredHandler,
                //matchHandler, 
                //maxHandler
            ];
    
            for (var handler of handlers) {
                if (!handler.call(this, fieldElement)) {
                    return false;
                }
            }
    
            this.hideError(fieldElement);
    
            return true;
        },
    
        equalHandler: function(fieldElement) {
            if (options && !options.equal) {
                return true;
            }
    
            var equalTo = options.equal,
                ele = document.querySelector(equalTo),
                equalMsg  = options.messages && options.messages.equal
                    || messages[messagesLang].equal.format(fieldElement.id, ele && ele.id);
    
            if (ele && getFieldValue(ele) !== getFieldValue(fieldElement)) {
                showError(fieldElement, equalMsg);
                return false;
            }
    
            return true;
        },
    
        matchHandler: function(fieldElement, options) {
            var match = options && options.match,
                str = new String(match);
    
            if (str[0] !== '/' && str[str.length] !== '/') { // is not a regex pattern
                match = regex[options.match];
            }
    
            if (!match) {
                return true;
            }
    
            if (!match.test(getFieldValue(fieldElement))) {
                var invalidMsg  = options && options.messages && options.messages.match
                    || messages[messagesLang].match.format(fieldElement.id); 
                showError(fieldElement, invalidMsg);
                return false;
            }
    
            return true;
        },
    
        requiredHandler: function(element) {
            var constranits = this.getFieldConstraints(element);

            if (!constranits || !constranits.required) {
                return true;
            }

            if (this.isEmpty(this.getFieldValue(element))) {
                var requiredMsg = constranits.messages && constranits.messages.required 
                                || this.messages[this.lang].required.format(element.id);
                this.showError(element, requiredMsg);
                return false;
            }
            
            return true;
        },
    
        maxHandler: function(fieldElement, options) {
            if (!options || !options.max) {
                return true;
            }
    
            if (this.getFieldValue(fieldElement) > Number.parseInt(options.max)) {
                var minMsg = options && options.max && options.messages && options.messages.max
                    || options && options.max && messages[messagesLang].max.format(fieldElement.id, options.max);
                showError(fieldElement, minMsg);
                return false;
            }
    
            return true;
        },
    
        getFieldValue: function(fieldElement) {
            return fieldElement.value || '';
        },

        mapOverFileds: function(callback) {
            var fields = this.form.querySelectorAll('input:not([type=submit]), select');

            if (fields.length < 0) {
                return false;
            }

            for (var key in fields) {
                if (fields.hasOwnProperty(key)) {
                    var field = fields[key];
                    callback.call(this, field);
                }
            }
        },

        showError: function(element, message) {
            if (!(element instanceof Element)) {
                return;
            }
    
            // if the span is already added just update just the text inside
            var span = this.getSiblingByClass(element, 'error');
            if (span) {
                span.textContent = message;
                return;
            }
    
            // create the span that shows the error message
            span = document.createElement('span');
    
            span.style.color = 'red';
            span.style.display = 'block';
            span.classList.add('error')
            span.textContent = message;
    
            element.style.border = '1px solid red';
            element.parentNode.insertBefore(span, element.nextSibling);
        },
    
        hideError: function(fieldElement) {
            var span = this.getSiblingByClass(fieldElement, 'error');
            if (span) {
                span.remove();
                // TODO revert to origin style
                fieldElement.style.border = '1px solid #999';
            }
        },
    
        getSiblingByClass: function(element, className) {
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

        getFieldConstraints: function(field) {
            return this.constraints && this.constraints[field.name]
        },

        isEmpty: function(value) {
            return !value || /^\s*$/.test(value);
        },
    };

    if (!String.prototype.format) {
        String.prototype.format = function() {
            var args = arguments;
            return this.replace(/{(\d+)}/g, function(match, number) { 
            return typeof args[number] != 'undefined'
                ? args[number]
                : match;
            });
        };
    }

    console.log(FormValidator({
        form: '#register_form', 
        constraints: {
            username: {
                "required": true,
                "match": "username",
                "max": 30,
                messages: {
                    //required: "Please enter the username!",
                    match: "Please enter a valid username."
                }
            }
        },
        events: ['change', 'submit'],
        lang: 'en'
    }));

    window.FormValidator = FormValidator;

})();