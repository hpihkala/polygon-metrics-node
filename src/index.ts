import { StreamPermission, StreamrClient } from 'streamr-client'
import { Config } from './types/ConfigTypes'
import { parseEnvToConfigs } from './parseUtils'
import { poll, getPrometheusMetrics } from './poll'

// Check required env variables
const requiredEnvs = ['METRICS_PRIVATE_KEY', 'VALIDATOR_NAME']
if (requiredEnvs.find(envName => process.env[envName] == null)) {
	console.error(`Error: The following env variables are required: \n${requiredEnvs.join('\n')}`)
	process.exit(1)
}

let configs: Config[]

try {
	configs = parseEnvToConfigs()
} catch (err) {
	console.error(`${err}`)
	process.exit(1)	
}

// If none of the endpoints are configured, error and stop
if (!configs.length) {
	console.error(`Error: No endpoints configured! Please give the URLs to the Prometheus ports of your nodes in one or more of the following env variables: VALIDATOR_BOR, VALIDATOR_HEIMDALL, SENTRY_BOR, SENTRY_HEIMDALL`)
	process.exit(1)
}

// Default poll interval 60 seconds
const pollIntervalSeconds = process.env.POLL_INTERVAL_SECONDS ? parseInt(process.env.POLL_INTERVAL_SECONDS) : 60
const requestTimeoutSeconds = process.env.REQUEST_TIMEOUT_SECONDS ? parseInt(process.env.REQUEST_TIMEOUT_SECONDS) : 10

const streamr = new StreamrClient({
	auth: {
		privateKey: process.env.METRICS_PRIVATE_KEY || 'undefined'
	}
})

function log(obj: any, fn: (m: any) => void = console.log) {
	fn(`${new Date().toISOString()} - ${obj}`)
}

;(async () => {
	// For good measure, print the address for the configured private key
	const address = await streamr.getAddress()
	log(`Metrics node configured with address: ${address}`)
	log(`Poll interval is ${pollIntervalSeconds} seconds`)
	log(`Request timeout is ${requestTimeoutSeconds} seconds\n`)

	// Check config before we start
	for (const config of configs) {
		const { streamId, url, configName } = config

		// Check stream permissions
		log(`${configName}: Checking that address ${address} has permission to publish to ${streamId}`)
		const stream = await streamr.getStream(streamId)
		const streamPermissionOk = await stream.hasPermission({
			user: address,
			permission: StreamPermission.PUBLISH,
			allowPublic: false,
		})

		if (!streamPermissionOk) {
			throw new Error(`Your address ${address} does not have permission to publish to ${streamId}!`)
		}

		// Check Prometheus API endpoint
		log(`${configName}: Checking that Prometheus API is accessible at ${url}`)
		try { 
			await getPrometheusMetrics(url, requestTimeoutSeconds)
		} catch (err) {
			throw new Error(`Couldn't successfully retrieve metrics for ${configName} from ${url}. Error was: ${err}`)
		}
	}

	log(`Everything seems fine!`)

	if (process.argv.find(arg => arg === '--test-config')) {
		process.exit(0)
	} else {
		// Start the timer and also poll immediately on start
		log(`Starting the metrics polling.\n`)
		const pollAll = () => configs.forEach((config) => poll(streamr, config, log, requestTimeoutSeconds))
		pollAll()
		setInterval(pollAll, pollIntervalSeconds * 1000)
	}
})()