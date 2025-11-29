# CloudWatch Log Group for API Gateway
resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "API-Gateway-Execution-Logs_${aws_api_gateway_rest_api.main.id}/${var.environment}"
  retention_in_days = 14

  tags = {
    Name = "${var.project_name}-api-gateway-logs"
  }
}

# CloudWatch Log Group for Lambda
resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${var.project_name}-api"
  retention_in_days = 14

  tags = {
    Name = "${var.project_name}-lambda-logs"
  }
}

# CloudWatch Metric Alarm for API Gateway 4XX Errors
resource "aws_cloudwatch_metric_alarm" "api_gateway_4xx" {
  alarm_name          = "${var.project_name}-api-gateway-4xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "4XXError"
  namespace           = "AWS/ApiGateway"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "This metric monitors api gateway 4xx errors"

  dimensions = {
    ApiName = aws_api_gateway_rest_api.main.name
    Stage   = var.environment
  }

  tags = {
    Name = "${var.project_name}-api-gateway-4xx-alarm"
  }
}

# CloudWatch Metric Alarm for API Gateway 5XX Errors
resource "aws_cloudwatch_metric_alarm" "api_gateway_5xx" {
  alarm_name          = "${var.project_name}-api-gateway-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "5XXError"
  namespace           = "AWS/ApiGateway"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "This metric monitors api gateway 5xx errors"

  dimensions = {
    ApiName = aws_api_gateway_rest_api.main.name
    Stage   = var.environment
  }

  tags = {
    Name = "${var.project_name}-api-gateway-5xx-alarm"
  }
}