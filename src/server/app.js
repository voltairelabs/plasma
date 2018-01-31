import express from 'express'
import logger from 'morgan'
import bodyParser from 'body-parser'

import routes from './routes'

const app = express()

app.use(
  logger('dev', {
    skip: () => app.get('env') === 'test'
  })
)
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: false}))

// Routes
app.use('/', routes)

// Catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new Error('Not Found')
  err.status = 404
  next(err)
})

// Error handler
app.use((err, req, res) => {
  res.status(err.status || 500).render('error', {
    message: err.message
  })
})

export default app
