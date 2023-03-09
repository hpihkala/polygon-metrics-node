module.exports = {
	apps : [{
	  name   : "polygon-metrics-node",
	  script : "npm",
	  args   : "start",
	  env    : {
		  "METRICS_PRIVATE_KEY": "",
		  "VALIDATOR_ETHEREUM_ADDRESS": "",
		  "VALIDATOR_HEIMDALL": "http://YOUR-VALIDATOR-IP:26660/metrics",
		  "VALIDATOR_BOR": "http://YOUR-VALIDATOR-IP:7071/debug/metrics/prometheus",
		  "SENTRY_HEIMDALL": "http://YOUR-SENTRY-IP:26660/metrics",
		  "SENTRY_BOR": "http://YOUR-SENTRY-IP:7071/debug/metrics/prometheus",
	  }
	}]
  }