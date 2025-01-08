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

To add:
Build the images and stuff, then in OpenShift do the steps you didn't save, then:

TODO: Setup Kafka ()

Create a KafkaCluster called 'kafka-cluster' in the wealthwise namespace    (kafka-cluster.yaml)
Create a topic for testing 'test-topic' (kafkatopic-test.yaml)



Scaleup the Machineset Count to add a new worker node...

Add the Kafka eventing source:
https://knative.dev/docs/eventing/sources/kafka-source/

oc apply -f https://github.com/knative-extensions/eventing-kafka-broker/releases/download/knative-v1.16.1/eventing-kafka-controller.yaml
oc apply -f https://github.com/knative-extensions/eventing-kafka-broker/releases/download/knative-v1.16.1/eventing-kafka-source.yaml
oc apply -f https://github.com/knative-extensions/eventing-kafka-broker/releases/download/knative-v1.16.1/eventing-kafka-channel.yaml
oc get deployments.apps,statefulsets.apps -n knative-eventing

oc adm policy add-scc-to-user privileged system:serviceaccount:knative-eventing:knative-kafka-source-data-plane
oc adm policy add-scc-to-user privileged system:serviceaccount:knative-eventing:knative-kafka-channel-data-plane

Edit the StatefulSet for the kafka-source-dispatcher, kafka-channel-dispatcher, Deployments for kafka-channel-receiver and add:
spec:
    template:
        metadata:
            annotations:
                openshift.io/required-scc: "privileged"



Add the Server-test-events (service-test-events.yaml)
Add the KafkaSource (kafkasource-test.yaml)
You should now be able to push stuff to Kafka using tests/generate-kafka-events.sh
And they should be received by the events service?

kafka-cluster-kafka-bootstrap.wealthwise.svc.cluster.local:9092


