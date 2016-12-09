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

  describe('solo', () => {

    before((done) => {
      app = express()

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
          expect(captureStdout).to.be.string
          expect(JSON.parse(captureStdout).id)
            .to.be.equal(res.headers['x-request-id'])
          expect(captureStderr).to.be.undefined
          done()
        })

    })
  })

  describe('using a middleware to generate x-request-id / id', () => {

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
          expect(captureStdout).to.be.string
          expect(JSON.parse(captureStdout).id)
            .to.be.equal(res.headers['x-request-id'])
          expect(captureStderr).to.be.undefined
          done()
        })
    })
  })

  describe('testing `req.log`', () => {

    it('should be successful', (done) => {
      app = express()

      app.use(logger(bunyan.createLogger({name: 'test'})))

      app.get('/', (req, res) => {
        expect(req.id).to.exist
        expect(req.log).to.exist
        expect(req.log).to.be.an('object')
        expect(req.log.fields.name).to.be.equal('test')
        expect(req.log.level()).to.be.equal(30)
        expect(req.log.info).to.be.a('function')
        expect(req.log.debug).to.be.a('function')
        expect(req.log.trace).to.be.a('function')
        expect(req.log.warn).to.be.a('function')
        expect(req.log.error).to.be.a('function')
        expect(req.log.serializers.req).to.exist
        expect(req.log.serializers.res).to.exist
        expect(req.log.serializers.err).to.exist
        res.send('Hello World')
      })

      request(app)
        .get('/')
        .expect(200, done)
    })
  })
})
