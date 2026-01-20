#!/bin/bash
# Script para compilar y desplegar la Lambda en LocalStack
# Ejecutar desde la raiz del proyecto

set -e

LOCALSTACK_ENDPOINT="http://localhost:4566"
AWS_REGION="us-east-1"
LAMBDA_NAME="order-notification"
QUEUE_NAME="order-created"
LAMBDA_DIR="lambda/order-notification"
HANDLER="com.proyecto.lambda.OrderNotificationHandler::handleRequest"
RUNTIME="java17"

echo "=== Desplegando Lambda a LocalStack ==="

# 1. Compilar la Lambda
echo ""
echo "1. Compilando Lambda..."
cd "$LAMBDA_DIR"
mvn clean package -DskipTests
cd ../..

# Verificar que el JAR existe
JAR_PATH="$LAMBDA_DIR/target/order-notification-lambda-1.0.0.jar"
if [ ! -f "$JAR_PATH" ]; then
    echo "ERROR: No se encontro el JAR en $JAR_PATH"
    exit 1
fi
echo "   JAR generado: $JAR_PATH"

# 2. Crear la funcion Lambda en LocalStack
echo ""
echo "2. Creando funcion Lambda..."

# Eliminar si existe
aws --endpoint-url=$LOCALSTACK_ENDPOINT \
    --region $AWS_REGION \
    lambda delete-function \
    --function-name $LAMBDA_NAME 2>/dev/null || true

# Crear nueva funcion
aws --endpoint-url=$LOCALSTACK_ENDPOINT \
    --region $AWS_REGION \
    lambda create-function \
    --function-name $LAMBDA_NAME \
    --runtime $RUNTIME \
    --handler $HANDLER \
    --role arn:aws:iam::000000000000:role/lambda-role \
    --zip-file fileb://$JAR_PATH \
    --timeout 30 \
    --memory-size 512 \
    --environment "Variables={ORDER_SERVICE_URL=http://host.docker.internal:8081}" \
    --output json

echo "   Lambda creada exitosamente"

# 3. Obtener ARN de la cola SQS
echo ""
echo "3. Configurando trigger SQS..."

QUEUE_URL=$(aws --endpoint-url=$LOCALSTACK_ENDPOINT \
    --region $AWS_REGION \
    sqs get-queue-url \
    --queue-name $QUEUE_NAME \
    --query 'QueueUrl' \
    --output text)

QUEUE_ARN=$(aws --endpoint-url=$LOCALSTACK_ENDPOINT \
    --region $AWS_REGION \
    sqs get-queue-attributes \
    --queue-url $QUEUE_URL \
    --attribute-names QueueArn \
    --query 'Attributes.QueueArn' \
    --output text)

echo "   Queue URL: $QUEUE_URL"
echo "   Queue ARN: $QUEUE_ARN"

# 4. Crear event source mapping (trigger SQS -> Lambda)
echo ""
echo "4. Creando event source mapping..."

# Eliminar mappings existentes
EXISTING_UUIDS=$(aws --endpoint-url=$LOCALSTACK_ENDPOINT \
    --region $AWS_REGION \
    lambda list-event-source-mappings \
    --function-name $LAMBDA_NAME \
    --query 'EventSourceMappings[].UUID' \
    --output text)

for UUID in $EXISTING_UUIDS; do
    aws --endpoint-url=$LOCALSTACK_ENDPOINT \
        --region $AWS_REGION \
        lambda delete-event-source-mapping \
        --uuid $UUID 2>/dev/null || true
done

# Crear nuevo mapping
aws --endpoint-url=$LOCALSTACK_ENDPOINT \
    --region $AWS_REGION \
    lambda create-event-source-mapping \
    --function-name $LAMBDA_NAME \
    --event-source-arn $QUEUE_ARN \
    --batch-size 5 \
    --output json

echo "   Event source mapping creado"

# 5. Verificar configuracion
echo ""
echo "=== Verificacion ==="
echo ""
echo "Lambda:"
aws --endpoint-url=$LOCALSTACK_ENDPOINT \
    --region $AWS_REGION \
    lambda get-function \
    --function-name $LAMBDA_NAME \
    --query 'Configuration.{Name:FunctionName,Runtime:Runtime,Handler:Handler,State:State}' \
    --output table

echo ""
echo "Event Source Mappings:"
aws --endpoint-url=$LOCALSTACK_ENDPOINT \
    --region $AWS_REGION \
    lambda list-event-source-mappings \
    --function-name $LAMBDA_NAME \
    --output table

echo ""
echo "=== Despliegue completado ==="
echo ""
echo "Para probar:"
echo "  1. Crear una orden via POST /api/orders"
echo "  2. La orden se creara con status=CREATED"
echo "  3. El evento se publicara a SQS"
echo "  4. La Lambda lo procesara y actualizara a status=NOTIFIED"
echo ""
echo "Ver logs de Lambda:"
echo "  aws --endpoint-url=$LOCALSTACK_ENDPOINT logs tail /aws/lambda/$LAMBDA_NAME --follow"
