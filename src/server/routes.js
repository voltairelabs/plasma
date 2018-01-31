import {Router} from 'express'
import {Validator} from 'jsonschema'

// RPC schema and validator
const rpcSchema = {
  id: '/RpcInput',
  type: 'object',
  properties: {
    jsonrpc: {type: 'string'},
    method: {type: 'string', required: true},
    params: {type: 'array', required: true},
    id: {type: 'number'}
  }
}
const rpcValidator = new Validator()

// create router
const routes = Router()

/**
 * POST RPC data
 */
routes.post('/', (req, res) => {
  const data = req.body
  const v = rpcValidator.validate(data, rpcSchema)
  if (v.errors && v.errors.length > 0) {
    return res.status(400).json({
      code: 'input-error',
      message: v.errors[0].stack
    })
  }

  res.json({success: true})
})

export default routes
