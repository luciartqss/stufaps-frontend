export const regex = {
  // http://emailregex.com/
  email:
    // eslint-disable-next-line no-useless-escape
    /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+\.)+[a-zA-Z\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]{2,}))$/,
  mobile: /^(?:\+639\d{2}|09\d{2}|\(09\d{2}\)[\s-]?)\d{3}[\s-]?\d{4}$/,
  telephone: /^(?:\(?\d{2,3}\)?\s?)?\d{3,4}[-.\s]?\d{4}(?:\s.*)?$/,
  locationX: /^([+-]?((([1-9]?[0-9]|1[0-7][0-9])(\.\d+)?)|180(\.0+)?))$/,
  locationY: /^([+-]?(([1-8]?[0-9](\.\d+)?)|(90(\.0+)?)))$/,

  // https://gist.github.com/dperini/729294
  url: /^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z0-9\u00a1-\uffff][a-z0-9\u00a1-\uffff_-]{0,62})?[a-z0-9\u00a1-\uffff]\.)+(?:[a-z\u00a1-\uffff]{2,}\.?))(?::\d{2,5})?(?:[/?#]\S*)?$/i,
}

const validate = (pattern, string) => pattern.test(string)

const patternValidation = {
  email: string => validate(regex.email, string),
  mobile: string => validate(regex.mobile, string),
  telephone: string => validate(regex.telephone, string),
  locationX: string => validate(regex.locationX, string),
  locationY: string => validate(regex.locationY, string),
  url: string => validate(regex.url, string),
}

export default patternValidation
