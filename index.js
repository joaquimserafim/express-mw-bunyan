/*
eslint
no-multi-spaces: ["error", {exceptions: {"VariableDeclarator": true}}]
padded-blocks: ["error", {"classes": "always"}]
max-len: ["error", 80]
*/
'use strict'

const setProp = require('set-prop-get-value')
const uuidV4  = require('uuid.v4')

module.exports = Logger

function Logger (bunyan, origin = 'request', headerName = 'X-Request-ID') {

  return logRequest

  function logRequest (req, res, next) {
    const startTime = process.hrtime()

    req.id || res.setHeader(headerName, setProp(req, 'id', uuidV4()))

    req.log = bunyan.child(
      {
        origin: origin,
        'req_id': req.id,
        serializers: bunyan.constructor.stdSerializers
      }
    )

    req.log.info({req: req}, 'start of the request')

    res.on('finish', onFinish)

    next()

    function onFinish () {
      const endTime = process.hrtime(startTime)

      req.log.info(
        {
          res: res,
          duration: endTime[0] * 1e3 + endTime[1] * 1e-6
        },
        'end of the response'
      )
    }
  }
}
