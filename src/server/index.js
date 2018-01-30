import config from '../config'
import app from './app'

// app listen
app.listen(config.app.port, (error, result) => {
  if (error) {
    console.log(error)
  } else {
    console.log(`Server started at ${config.app.port}`)
  }
})

export default app
