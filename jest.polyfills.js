const { TextEncoder, TextDecoder } = require('util')

Object.assign(global, { TextEncoder, TextDecoder })

// Mock other globals that might be needed
global.Request = global.Request || class Request {}
global.Response = global.Response || class Response {}
global.Headers = global.Headers || class Headers {} 