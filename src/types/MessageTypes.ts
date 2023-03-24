export interface MetricsMessage {
	version: number
	validator: string
	metrics: { [name: string]: Measurable }
}

export interface Measurable {
	help?: string
	type: MetricType
	metrics: any[]
	error?: string
}

enum MetricType {
	GAUGE,
	COUNTER,
	SUMMARY,
	HISTOGRAM,
}

export interface ParsedPrometheusMessage {
	name: string
	help: string
	type: MetricType
	metrics: any[]
}