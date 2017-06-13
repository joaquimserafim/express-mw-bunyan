/*
eslint
no-multi-spaces: ["error", {exceptions: {"VariableDeclarator": true}}]
padded-blocks: ["error", {"classes": "always"}]
max-len: ["error", 80]
*/
'use strict'

const express       = require('express')
const request       = require('supertest')
const setRequestId  = require('express-mw-correlation-id')
const bodyParser    = require('body-parser')
const bunyan        = require('bunyan')
const mocha         = require('mocha')
const expect        = require('chai').expect

const it          = mocha.it
const describe    = mocha.describe
const before      = mocha.before
const beforeEach  = mocha.beforeEach

const logger = require('./')

let app
let captureStdout
let captureStderr

describe('express-mw-bunyan', () => {

  beforeEach(() => {
    let stdoutWrite = process.stdout.write
    let stderrtWrite = process.stderr.write

    process.stdout.write = function (text) {
      captureStdout = text
      process.stdout.write = stdoutWrite
      process.stdout.write(text)
    }

    process.stderr.write = function (text) {
      captureStderr = text
      process.stderr.write = stderrtWrite
      process.stderr.write(text)
    }
  })

  describe('solo use', () => {

    before((done) => {
      app = express()

      app.use(bodyParser.json())
      app.use(logger(bunyan.createLogger({name: 'test'})))

      app.get('/', (req, res) => {
        res.send('Hello World')
      })

      app.post('/', (req, res) => {
        res.status(201).send()
      })

      done()
    })

    it('should be successful', (done) => {
      request(app)
        .get('/?hey=yay')
        .end((err, res) => {
          expect(err).to.be.a('null')
          expect(res).to.be.an('object')
          expect(captureStdout).to.be.a('string')
          expect(JSON.parse(captureStdout)['req_id'])
            .to.be.equal(res.headers['x-request-id'])
          expect(captureStderr).to.be.an('undefined')
          done()
        })
    })

    it('should be successful with body', (done) => {
      request(app)
        .post('/')
        .send({a: 1})
        .end((err, res) => {
          expect(err).to.be.a('null')
          expect(res).to.be.an('object')
          expect(res.statusCode).to.be.equal(201)
          expect(captureStdout).to.be.a('string')
          expect(JSON.parse(captureStdout)['req_id'])
            .to.be.equal(res.headers['x-request-id'])
          expect(captureStderr).to.be.an('undefined')
          done()
        })
    })
  })

  describe('serializers override', () => {
    const log = bunyan.createLogger(
      {
        name: 'test',
        serializers: Object.assign(
          bunyan.stdSerializers,
          {
            req: reqSerializer
          }
        )
      }
    )

    function reqSerializer (req) {
      return {
        payload: req.body
      }
    }

    before((done) => {
      app = express()

      app.use(bodyParser.json())
      app.use(logger(log))

      app.post('/', (req, res) => {
        res.status(201).send()
      })

      done()
    })

    it('should be successful with body and req serializer override', (done) => {
      request(app)
        .post('/')
        .send({a: 1})
        .end((err, res) => {
          expect(err).to.be.a('null')
          expect(res).to.be.an('object')
          expect(res.statusCode).to.be.equal(201)
          expect(captureStdout).to.be.a('string')
          expect(JSON.parse(captureStdout)['req_id'])
            .to.be.equal(res.headers['x-request-id'])
          expect(JSON.parse(captureStdout).req.payload)
            .to.be.deep.equal({a: 1})
          expect(captureStderr).to.be.an('undefined')
          done()
        })
    })
  })

  describe('using a middleware to generate the x-request-id/id', () => {

    before((done) => {
      app = express()

      app.use(setRequestId())
      app.use(logger(bunyan.createLogger({name: 'test'})))

      app.get('/', (req, res) => {
        res.send('Hello World')
      })

      done()
    })

    it('should be successful', (done) => {
      request(app)
        .get('/')
        .end((err, res) => {
          expect(err).to.be.a('null')
          expect(res).to.be.an('object')
          expect(captureStdout).to.be.a('string')
          expect(JSON.parse(captureStdout)['req_id'])
            .to.be.equal(res.headers['x-request-id'])
          expect(captureStderr).to.be.an('undefined')
          done()
        })
    })
  })

  describe('testing `req.log interface`', () => {

    it('should be successful', (done) => {
      app = express()

      app.use(logger(bunyan.createLogger({name: 'test'})))

      app.get('/', (req, res) => {
        expect(req.id).to.be.a('string')
        expect(req.log).to.be.an('object')
        expect(req.log.fields.name).to.be.equal('test')
        expect(req.log.level()).to.be.equal(30)
        expect(req.log.info).to.be.a('function')
        expect(req.log.debug).to.be.a('function')
        expect(req.log.trace).to.be.a('function')
        expect(req.log.warn).to.be.a('function')
        expect(req.log.error).to.be.a('function')
        expect(req.log.serializers.req).to.be.a('function')
        expect(req.log.serializers.res).to.be.a('function')
        expect(req.log.serializers.err).to.be.a('function')
        res.send('Hello World')
      })

      request(app)
        .get('/')
        .expect(200, done)
    })
  })
})

describe('unit test', () => {
  let reqStubbed
  let resStubbed

  beforeEach(() => {
    reqStubbed = {}

    resStubbed = {
      headers: {},
      setHeader (key, val) {
        resStubbed.headers[key] = val
      },
      on (key, fn) {
        fn()
      }
    }
  })

  it('should throw when miss the bunyan `createLogger`', (done) => {

    expect(exception).to.throw(Error)
    done()

    function exception () {
      logger()(reqStubbed, resStubbed, () => {})
    }
  })

  it('with the bunyan `createLogger`', (done) => {
    let spyLogger = logger(bunyan.createLogger({name: 'test123'}))

    spyLogger(reqStubbed, resStubbed, () => {
      expect(reqStubbed.id).to.be.a('string')
      expect(reqStubbed.log).to.be.an('object')
      expect(reqStubbed.log.fields['req_id']).to.be.a('string')
      expect(reqStubbed.log.fields.pid).to.be.a('number')
      expect(reqStubbed.log.fields.hostname).to.be.a('string')
      expect(reqStubbed.log.fields.name).to.be.equal('test123')
      expect(reqStubbed.log.fields.origin).to.be.equal('request')
      expect(resStubbed.headers['X-Request-ID']).to.be.a('string')

      done()
    })
  })

  it('setting a different headerName', (done) => {
    let spyLogger = logger(
      bunyan.createLogger({name: 'test123'}),
      undefined,
      'TEST123'
    )

    spyLogger(reqStubbed, resStubbed, () => {
      expect(reqStubbed.id).to.be.a('string')
      expect(reqStubbed.log).to.be.an('object')
      expect(reqStubbed.log.fields['req_id']).to.be.a('string')
      expect(reqStubbed.log.fields.pid).to.be.a('number')
      expect(reqStubbed.log.fields.hostname).to.be.a('string')
      expect(reqStubbed.log.fields.name).to.be.equal('test123')
      expect(reqStubbed.log.fields.origin).to.be.equal('request')
      expect(resStubbed.headers['TEST123']).to.be.a('string')

      done()
    })
  })

  it('setting a different origin', (done) => {
    let spyLogger = logger(
      bunyan.createLogger({name: 'test'}),
      'FROM_MY_CODE'
    )

    spyLogger(reqStubbed, resStubbed, () => {
      expect(reqStubbed.id).to.be.a('string')
      expect(reqStubbed.log).to.be.an('object')
      expect(reqStubbed.log.fields['req_id']).to.be.a('string')
      expect(reqStubbed.log.fields.pid).to.be.a('number')
      expect(reqStubbed.log.fields.hostname).to.be.a('string')
      expect(reqStubbed.log.fields.name).to.be.equal('test')
      expect(reqStubbed.log.fields.origin).to.be.equal('FROM_MY_CODE')
      expect(resStubbed.headers['X-Request-ID']).to.be.a('string')

      done()
    })
  })
})
