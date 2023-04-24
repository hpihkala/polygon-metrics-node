import axios from 'axios'
import parsePrometheusTextFormat from 'parse-prometheus-text-format'

import { MetricsMessage, Measurable, ParsedPrometheusMessage } from './types/MessageTypes'
import { Config } from './types/ConfigTypes'
import StreamrClient from 'streamr-client'

export async function getPrometheusMetrics(url: string, requestTimeoutSeconds: number): Promise<ParsedPrometheusMessage[]> {
	// Fetch from the Prometheus endpoint			
	const response = await axios.get(url, {
		timeout: requestTimeoutSeconds * 1000,
	})

	// Parse the Prometheus text format to an object format
	return parsePrometheusTextFormat(response.data)
}

export async function poll(streamr: StreamrClient, config: Config, log: (msg: any) => void, requestTimeoutSeconds: number) {
	try {
		const { url, streamId, nodeName, configName } = config
		if (url && streamId) {
			// Fetch the metrics data from the node
			const parsedPrometheusFormat = await getPrometheusMetrics(url, requestTimeoutSeconds)

			// Transform it a bit
			const message: MetricsMessage = {
				version: 1,
				validator: nodeName,
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
					log(`${configName}: Metric ${prometheusEntry.name} omitted due to size: ${measurable.metrics.length}, limit: ${100}`)
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
}