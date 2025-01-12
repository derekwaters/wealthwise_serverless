# wealthwise_serverless

# Create a local registry
# Actually this isn't needed!
docker run -d -p 5000:5000 --name registry registry:latest

# Start a Kafka server in a container
docker run -d -p 9092:9092 --name kafka_broker apache/kafka:latest


# Build the serverless images
cd func-balance
kn func build --builder s2i --platform "linux/arm64" --registry "localhost:5000"
cd ../func-check-notifications
kn func build --builder s2i --platform "linux/arm64" --registry "localhost:5000"
cd ../func-cost-suggest
kn func build --builder s2i --platform "linux/arm64" --registry "localhost:5000"
cd ../func-product-suggest
kn func build --builder s2i --platform "linux/arm64" --registry "localhost:5000"
cd ../func-transact
kn func build --builder s2i --platform "linux/arm64" --registry "localhost:5000"

# Run the functions
cd func-balance
kn func run --registry "localhost:5000" -e KAFKA_BROKER_HOST=kafka_broker -e KAFKA_BROKER_PORT=9092

# Test it
curl -X POST -d '{"type":"deposit","amount":1000}' -H "Content-Type: application/json" http://localhost:8080




# Setting up in OpenShift
1) Create the blank OpenShift Environment (use large node sizes!)
2) Install the OpenShift Serverless Operator
3) Install the streams for Apache Kafka Operator
4) Install the KNative Serving CR in the knative-serving namespace?!
5) Install the KNative Eventing CR in the knative-eventing namespace?!
6) Create a 'kafka' namespace/project
7) Create a 'wealthwise' namespace/project
8) Create a KafkaCluster called 'kafka-cluster' in the kafka namespace    (kafka-cluster.yaml)
9) Create a topic for testing 'test-topic' (kafkatopic-test.yaml)
10) Install the KNative Kafka CR in the knative-eventing namespace, ensuring that channel, source and broker are enabled (use the Kafka bootstrap server address)   (knativekafka-definition.yaml)

11) Add the Server-test-events (service-test-events.yaml)
12) Add the KafkaSource (kafkasource-test.yaml)
You should now be able to push stuff to Kafka using tests/generate-kafka-events.sh
And they should be received by the events service?






Scaleup the Machineset Count to add a new worker node...

13) Create a postgresql database with storage (Developer -> +Add -> database -> postgresql) -> username = 'pguser', password = 'abc123', otherwise defaults.





# DON'T DO ANY OF THIS - USE THE KNative Kafka CR you idiot
#
# Add the Kafka eventing source:
# https://knative.dev/docs/eventing/sources/kafka-source/
#
# oc apply -f https://github.com/knative-extensions/eventing-kafka-broker/releases/download/knative-v1.16.1/eventing-kafka-controller.yaml
# oc apply -f https://github.com/knative-extensions/eventing-kafka-broker/releases/download/knative-v1.16.1/eventing-kafka-source.yaml
# oc apply -f https://github.com/knative-extensions/eventing-kafka-broker/releases/download/knative-v1.16.1/eventing-kafka-channel.yaml
# oc get deployments.apps,statefulsets.apps -n knative-eventing
#
# oc adm policy add-scc-to-user privileged system:serviceaccount:knative-eventing:knative-kafka-source-data-plane
# oc adm policy add-scc-to-user privileged system:serviceaccount:knative-eventing:knative-kafka-channel-data-plane
#
# Edit the StatefulSet for the kafka-source-dispatcher, kafka-channel-dispatcher, Deployments for kafka-channel-receiver and add:
# spec:
#     template:
#         metadata:
#             annotations:
#                 openshift.io/required-scc: "privileged"
#
#


// Let's listen to our three Kafka topics

kubectl -n wealthwise run kafka-consumer-transactions -ti --image=quay.io/strimzi/kafka:0.26.1-kafka-3.0.0 --rm=true --restart=Never -- bin/kafka-console-consumer.sh --bootstrap-server kafka-cluster-kafka-bootstrap.kafka.svc.cluster.local:9092 --topic wealthwise-transactions

kubectl -n wealthwise run kafka-consumer-notifications -ti --image=quay.io/strimzi/kafka:0.26.1-kafka-3.0.0 --rm=true --restart=Never -- bin/kafka-console-consumer.sh --bootstrap-server kafka-cluster-kafka-bootstrap.kafka.svc.cluster.local:9092 --topic wealthwise-user-notifications

kubectl -n wealthwise run kafka-consumer-balance -ti --image=quay.io/strimzi/kafka:0.26.1-kafka-3.0.0 --rm=true --restart=Never -- bin/kafka-console-consumer.sh --bootstrap-server kafka-cluster-kafka-bootstrap.kafka.svc.cluster.local:9092 --topic wealthwise-balance-updates


// Let's try a deposit
// Verify that you see an event in wealthwise-transactions topic
//
curl -d '{"userId":123,"type":"deposit","amount":1234.56,"vendor":"employer"}' -H "Content-Type: application/json" -X POST https://wealthwise-transact-wealthwise.apps.cluster-pp57d.pp57d.sandbox2287.opentlc.com

// Now an expense
//
curl -d '{"userId":123,"type":"expense","amount":500.00,"vendor":"bills"}' -H "Content-Type: application/json" -X POST https://wealthwise-transact-wealthwise.apps.cluster-pp57d.pp57d.sandbox2287.opentlc.com
// We can see transactions, but nothing in notifications? Oh right, our cost function only posts for small expenses or large bank expenses!
curl -d '{"userId":123,"type":"expense","amount":5.50,"vendor":"cafe"}' -H "Content-Type: application/json" -X POST https://wealthwise-transact-wealthwise.apps.cluster-pp57d.pp57d.sandbox2287.opentlc.com
// Now we got something!

curl -d '{"userId":123,"type":"expense","amount":2500.00,"vendor":"bank"}' -H "Content-Type: application/json" -X POST https://wealthwise-transact-wealthwise.apps.cluster-pp57d.pp57d.sandbox2287.opentlc.com
// And again!

// Check that we see balance updates
// OK, let's get our balance up

curl -d '{"userId":123,"type":"deposit","amount":10000.0,"vendor":"bonus"}' -H "Content-Type: application/json" -X POST https://wealthwise-transact-wealthwise.apps.cluster-pp57d.pp57d.sandbox2287.opentlc.com

// Check notifications for a "shares" recommendation

curl -d '{"userId":123,"type":"deposit","amount":200000.0,"vendor":"inheritance"}' -H "Content-Type: application/json" -X POST https://wealthwise-transact-wealthwise.apps.cluster-pp57d.pp57d.sandbox2287.opentlc.com

// Check notifications for a "property" recommendation





Tips for young players:

The command line build params (architecture, registry, s2i) can be specified in func.yaml rather than adding them on the command line each time
Read the @#$%ing manual! (Install the KNativeKafka resource rather than trying to deploy it yourself :-( )
Comments in kn func templates aren't always 100% accurate
BuildTemplates in OpenShift don't seem to be working currently?
Format of messages for the kafkajs interface is important (need to specify <obj>.value = "some data")
Learn about the CloudEvents interface - Kafka "messages" can be anything, so you'll just get a buffer of bytes (which you'll have to convert to JSON)
context.log.info not console.log!
Get comfortable with kubectl run quay.io/strimzi/kafka to produce and consume Kafka messages
While testing, use:
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/minScale: "2"
 so you can have a long-running log
Check and make sure that docker containers have internet access, otherwise it appears that the build works, but it really doesn't...
Add good error handling, otherwise the faas- logging thing doesn't give you much info other than that "user function failed"
