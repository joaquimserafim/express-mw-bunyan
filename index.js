/*
eslint
no-multi-spaces: ["error", {exceptions: {"VariableDeclarator": true}}]
padded-blocks: ["error", {"classes": "always"}]
max-len: ["error", 80]
*/
'use strict'

const setProp = require('set-prop-get-value')

module.exports = Logger

function Logger (bunyan) {
  let counter = 10000

  return logRequest

  function logRequest (req, res, next) {
    const startTime = process.hrtime()

    counter++

    req.id || res.setHeader(
        'X-Request-ID',
        setProp(
          req,
          'id',
          uuid(req.hostname, process.pid, new Date().valueOf(), counter)
        )
      )

    req.log = bunyan.child(
      {
        origin: 'request',
        id: req.id,
        serializers: bunyan.constructor.stdSerializers
      }
    )

    req.log.info({req: req}, 'start of the request')

    req.on('end', () => {
      const endTime = process.hrtime(startTime)

      req.log.info(
        {
          res: res,
          duration: endTime[0] * 1e3 + endTime[1] * 1e-6
        },
        'end of the request'
      )
    })

    next()
  }
}

function uuid (hostname, pid, date, counter) {
  return `${new Date().valueOf()}:${hostname}:` +
    `${pid}:${date.toString(36)}:${counter}`
}
