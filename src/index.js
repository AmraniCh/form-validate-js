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
        fileds: {},
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

        this.fileds = options.fileds || {};
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
                        self.bindEvent('submit', self.form, function() {
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
            console.log('validation...');
        },

        validate: function() {
            console.log('validate single element...');
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

    };

    console.log(FormValidator({
        form: '#register_form', 
        fileds: {
            username: {
                "required": true,
                "match": "username",
                "max": 30,
                messages: {
                    required: "Please enter the username!",
                    match: "Please enter a valid username."
                }
            }
        },
        events: ['change', 'submit'],
        lang: 'fr'
    }));

    window.FormValidator = FormValidator;

})();