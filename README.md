# Form Validate JS

Light and simple JavaScript form validation library with support of native HTML5 validation attributes and input types.

## Simple usage example

```javascript
FormValidator('#myForm', {
    events: ['submit', 'input'],
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
            maxlength: function() {
                // some logic
                return 30,
            },
            messages: {
                match: 'Accept only characters and numbers.',
            },
        },
        confirm_password: {
            required: true,
            equal: '#password',
        },
    },
    // optional
    submitHandler: function () {
        // handle manuallly the submitting of the form
    },
    // optional
    invalidHandler: function () {
        // get the form errors
        console.log(this.errors);
    },
});
```

## Supported settings and their default values

| Name       | description                                   | optional           | default value |
| ---------- | --------------------------------------------- | ------------------ | ------------- |
| events     | specifies the validation events in an array   | :heavy_check_mark: | ['submit']    |
| lang       | specifies the error messages display language | :heavy_check_mark: | en            |
| showErrors | whether to show error messages or not         | :heavy_check_mark: | true          |

## Supported constraint types

| Name      | description                                                                                                                                                   | Type                     |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| required  | requiring the field                                                                                                                                           | Boolean\|Function        |
| match     | The field value must match a regex, the value of this constraint can be either one of the regular expression defined by the library or a custom regex pattern | String\|RegExp\|Function |
| maxlength | The field value cannot be greater than the giving value                                                                                                       | Number\|Function         |
| equal     | The field value must be the same to other field value                                                                                                         | String                   |

**note : All the constraint types can accept a function value that must return the value needed for the constraint type.**

Example :

```javascript
FormValidator('#myForm', {
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

## Supported regular expressions for the 'match' constraint type

:heavy_check_mark: username <br>
:heavy_check_mark: email <br>
:heavy_check_mark: number <br>

## Supported languages for error messages

:heavy_check_mark: English <br>
:heavy_check_mark: French <br>

## Error messages

You can specify and customize the error messages with the `messages` object, and this is two ways to do that.

### Specify your own message

```javascript
username: {
    maxlength: 30,
    messages: {
        maxlength: "username length cannot be greater than {0} characters."
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

## Override the default error messages

```javascript
var validate = FormValidator('#myForm');

validate.defaults.messages.en = {
    custom: 'not match the regex pattern [{0}].',
    email: '{0} is not a valid email address.',
    username: '{0} is not valid username.',
    number: '{0} is not valid number.',
    required: 'required.',
    maxlength: 'maximaux characters length is {0}.',
    equal: 'not the same value.',
};

/**
 * Because the error messages sets when calling the FormValidator function 
 * constructor we need to rebuild the constraints object to apply
 * the error messages tha we've just override above
 */
validate.buildConstraints();
```