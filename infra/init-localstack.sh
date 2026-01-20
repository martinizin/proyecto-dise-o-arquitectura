#!/bin/bash
# Script para inicializar LocalStack con la cola SQS
# Ejecutar despues de que LocalStack este corriendo

set -e

LOCALSTACK_ENDPOINT="http://localhost:4566"
QUEUE_NAME="order-created"
AWS_REGION="us-east-1"

echo "=== Inicializando LocalStack ==="

# Esperar a que LocalStack este listo
echo "Esperando a que LocalStack este disponible..."
until curl -s "$LOCALSTACK_ENDPOINT/_localstack/health" | grep -q '"sqs": "running"'; do
    echo "  Esperando SQS..."
    sleep 2
done
echo "LocalStack SQS esta listo!"

# Crear la cola SQS
echo ""
echo "Creando cola SQS: $QUEUE_NAME"
aws --endpoint-url=$LOCALSTACK_ENDPOINT \
    --region $AWS_REGION \
    sqs create-queue \
    --queue-name $QUEUE_NAME \
    --output json

# Obtener URL de la cola
QUEUE_URL=$(aws --endpoint-url=$LOCALSTACK_ENDPOINT \
    --region $AWS_REGION \
    sqs get-queue-url \
    --queue-name $QUEUE_NAME \
    --query 'QueueUrl' \
    --output text)

echo ""
echo "Cola creada exitosamente!"
echo "Queue URL: $QUEUE_URL"

# Listar colas para verificar
echo ""
echo "Colas SQS disponibles:"
aws --endpoint-url=$LOCALSTACK_ENDPOINT \
    --region $AWS_REGION \
    sqs list-queues \
    --output table

echo ""
echo "=== Inicializacion completada ==="
echo ""
echo "Variables de entorno para Order Service:"
echo "  AWS_SQS_ENDPOINT=$LOCALSTACK_ENDPOINT"
echo "  AWS_SQS_QUEUE_NAME=$QUEUE_NAME"
echo "  AWS_REGION=$AWS_REGION"
