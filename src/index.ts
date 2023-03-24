import { StreamPermission, StreamrClient } from 'streamr-client'
import axios from 'axios'
import parsePrometheusTextFormat from 'parse-prometheus-text-format'

import { MetricsMessage, Measurable, ParsedPrometheusMessage } from './types/MessageTypes'
import { Config } from './types/ConfigTypes'

// Check required env variables
const requiredEnvs = ['METRICS_PRIVATE_KEY', 'VALIDATOR_NAME']
if (requiredEnvs.find(envName => process.env[envName] == null)) {
	console.error(`Error: The following env variables are required: \n${requiredEnvs.join('\n')}`)
	process.exit(1)
}

// Prometheus endpoints and streams configuration - at least one of the endpoints must be set for this script to do anything
const config: Config = {
	'Validator Bor': {
		url: process.env.VALIDATOR_BOR,
		streamId: 'polygon-validators.eth/validator/bor',
	},
	'Validator Heimdall': {
		url: process.env.VALIDATOR_HEIMDALL,
		streamId: 'polygon-validators.eth/validator/heimdall',
	},
	'Sentry Bor': {
		url: process.env.SENTRY_BOR,
		streamId: 'polygon-validators.eth/sentry/bor',
	},
	'Sentry Heimdall': {
		url: process.env.SENTRY_HEIMDALL,
		streamId: 'polygon-validators.eth/sentry/heimdall',
	},
}

// If none of the endpoints are configured, error and stop
if (!Object.keys(config).find(configName => config[configName].url && config[configName].streamId)) {
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

async function getPrometheusMetrics(url: string): Promise<ParsedPrometheusMessage[]> {
	// Fetch from the Prometheus endpoint			
	const response = await axios.get(url, {
		timeout: requestTimeoutSeconds * 1000,
	})

	// Parse the Prometheus text format to an object format
	return parsePrometheusTextFormat(response.data)
}

async function poll() {
	// Poll metrics data from each of the configured endpoints
	Object.keys(config).forEach(async (configName) => {
		try {
			const { url, streamId } = config[configName]
			if (url && streamId) {
				// Fetch the metrics data from the node
				const parsedPrometheusFormat = await getPrometheusMetrics(url)

				// Transform it a bit
				const message: MetricsMessage = {
					version: 1,
					validator: process.env.VALIDATOR_NAME || 'unknown',
					metrics: {}
				}
				parsedPrometheusFormat.forEach((prometheusEntry) => {
					const measurable: Measurable = {
						type: prometheusEntry.type,
						metrics: prometheusEntry.metrics,
						help: prometheusEntry.help
					}
					
					// Don't include empty help messages
					if (measurable.help === '') {
						delete measurable.help
					}

					// Don't include very large metrics
					const sizeLimit = (process.env.MAX_METRICS_LENGTH ? parseInt(process.env.MAX_METRICS_LENGTH) : 100)
					if (measurable.metrics.length >= sizeLimit) {
						measurable.error = `Metric omitted due to size: ${measurable.metrics.length}, limit: ${100}`
						log(`Metric ${prometheusEntry.name} omitted due to size: ${measurable.metrics.length}, limit: ${100}`)
						measurable.metrics = []
					}

					message.metrics[prometheusEntry.name] = measurable
				})

				// Publish to the stream
				await streamr.publish(streamId, message)
				log(`${configName}: Success`)
			}
		} catch (err) {
			log(`${err}`)
		}
	})
}

;(async () => {
	// For good measure, print the address for the configured private key
	const address = await streamr.getAddress()
	log(`Metrics node configured with address: ${address}`)
	log(`Poll interval is ${pollIntervalSeconds} seconds`)
	log(`Request timeout is ${requestTimeoutSeconds} seconds\n`)

	// Check config before we start
	for (const configName of Object.keys(config)) {
		const { streamId, url } = config[configName]

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
		if (url) {
			log(`${configName}: Checking that Prometheus API is accessible at ${url}`)
			try { 
				await getPrometheusMetrics(url)
			} catch (err) {
				throw new Error(`Couldn't successfully retrieve metrics for ${configName} from ${url}. Error was: ${err}`)
			}
		} else {
			log(`WARN: Skipping ${configName} because the Prometheus API URL is not configured. Your Metrics node is publishing only part of the metrics.`)
		}
	}

	log(`Everything seems fine!`)

	if (process.argv.find(arg => arg === '--test-config')) {
		process.exit(0)
	} else {
		// Start the timer and also poll immediately on start
		log(`Starting the metrics polling.\n`)
		poll()
		setInterval(poll, pollIntervalSeconds * 1000)
	}
})()