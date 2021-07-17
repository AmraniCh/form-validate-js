# form-validate-js

Light and simple JavaScript form validation library that support the native HTML5 validation attributes and input types.

Still under development :sleeping:

## Simple usage example

```javascript
FormValidator('#register_form', {
    events: ['submit', 'change', 'input'], 
    constraints: {
        // specifies constraints for form fileds
        username: {
            required: true,
            match: 'username',
            maxlength: 30,
        },
        password: {
            required: true,
            match: /^[a-zA-Z0-9]*$/,
            maxlength: 15,
            messages: {
                match: 'Accept only characters and numbers.',
            },
        },
        confirm_password: {
            required: true,
            equal: '#password',
        },
    },
    submitHandler: function () {
        // handle manuallly the submitting of the form
    },
    invalidHandler: function () {
        // get the form errors
        console.log(this.errors);
    },
});
```

## Supported settings and their default values

| Name              | description                                                         | optional | default value 
| ----------------- | ------------------------------------------------------------------- |--------- | -------------
| events            | specifies the validation events in an array                         | :heavy_check_mark:    | ['submit']
| lang              | specifies the error messages display language                       | :heavy_check_mark:    | en
| showErrors        | whether to show error messages or not                               | :heavy_check_mark:    | true
    
## Supported constraint types
  
| Name              | description                                                         | Type               |
| ----------------- | ------------------------------------------------------------------- | ------------------ |
| required          | requiring the field                                                 | Boolean\|Function   |
| match             | The field value must match a regex, the value of this constraint can be either one of the regular expression defined by the library or a custom regex pattern | String\|RegExp\|Function |
| maxlength         | The field value cannot be greater than the giving value             | Number\|Function  |


**note : All the constraint types can accept a function value that must return the value needed for the constraint type.**

Example : 

```javascript
FormValidator('#register_form', {
    constraints: {
        username: {
            maxlength: function () {
                // logic
                return length;
            },
        },
    },
});
```


## Regex patterns supported

- username
- email
- number

## Error messages

You can specify and customize the error messages with the `messages` object, and this is two ways to do that.

### Specify your own message

```javascript
email: {
    match: 'email',
    messages: {
        match: "{0} is invalid email, please type a valid one!"
    }
}
```

### Altering the default message

```javascript
username: {
    required: true,
    messages: {
        required: function(msg) {
                return "Error : " + msg;
        }
    }
}
```


## Adding a custom regex

You can add a custom regex matches using the static method `FormValidator.addMatch`, its take as a first parameter the regex name, the second parameter can be either a callback function or a regex pattern, and the last argument is an object that contains the error messages.

```javascript
var myUsername = FormValidator.addMatch(
    'username',

    function (value, element) {
        // some logic
        return /^[a-zA-Z]+$/.test(value);
    },

    // OR => /^[a-zA-Z]+$/,

    {
        fr: "Le nom du l'utilisateur doit contient des caractères seulement!",
        en: 'The username must contains only charcters!',
    }
);

var validate = FormValidator('#register_form', {
    constraints: {
        username: {
            required: true,
            match: myUsername,
        },
    },
});
```

##  Override the default error messages


```javascript
FormValidator('#register_form');

validate.defaults.messages.en = {
    match: {
        email: 'not a valid email address.',
        username: 'not valid username.',
        number: 'not valid number.',
    },
    required: 'required.',
    maxlength: 'maximaux characters length is {0}.',
    equal: 'not the same value.',
};

/**
 * Because the error messages sets when calling the FormValidator 
 * function we need to rebuild the constraints object to apply 
 * the error messages we just override above
 */
validate.buildConstraints({
    username: {
        required: true,
        match: 'username',
    },
});
```
