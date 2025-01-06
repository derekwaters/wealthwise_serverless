# wealthwise_serverless

# Create a local registry
podman run -d -p 5000:5000 --name registry registry:latest

# Start a Kafka server in a container
podman run -d -p 9092:9092 --name kafka_broker apache/kafka:latest


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