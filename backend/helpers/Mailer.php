<?php

declare(strict_types=1);

final class Mailer
{
    private array $config;

    public function __construct()
    {
        $appConfig = require dirname(__DIR__) . '/config/app.php';
        $this->config = $appConfig['mail'];
    }

    public function send(string $to, string $subject, string $body, bool $isHtml = true, ?string $replyTo = null): bool
    {
        $autoload = dirname(__DIR__) . '/vendor/autoload.php';

        if (file_exists($autoload)) {
            require_once $autoload;

            if (class_exists(\PHPMailer\PHPMailer\PHPMailer::class)) {
                return $this->sendViaPhpMailer($to, $subject, $body, $isHtml, $replyTo);
            }
        }

        return $this->sendViaMailFunction($to, $subject, $body, $isHtml, $replyTo);
    }

    private function sendViaPhpMailer(string $to, string $subject, string $body, bool $isHtml, ?string $replyTo = null): bool
    {
        try {
            $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
            $mail->isSMTP();
            $mail->Host = $this->config['host'];
            $mail->SMTPAuth = !empty($this->config['username']);
            $mail->Username = $this->config['username'];
            $mail->Password = $this->config['password'];
            $mail->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port = $this->config['port'];

            $mail->setFrom($this->config['from_address'], $this->config['from_name']);
            $mail->addAddress($to);
            if ($replyTo && filter_var($replyTo, FILTER_VALIDATE_EMAIL)) {
                $mail->addReplyTo($replyTo);
            }
            $mail->Subject = $subject;

            if ($isHtml) {
                $mail->isHTML(true);
                $mail->Body = $body;
                $mail->AltBody = strip_tags($body);
            } else {
                $mail->Body = $body;
            }

            $mail->send();
            return true;
        } catch (\Throwable $e) {
            error_log('Mailer error: ' . $e->getMessage());
            return false;
        }
    }

    private function sendViaMailFunction(string $to, string $subject, string $body, bool $isHtml, ?string $replyTo = null): bool
    {
        $headers = [
            'From: ' . $this->config['from_name'] . ' <' . $this->config['from_address'] . '>',
            'Reply-To: ' . ($replyTo && filter_var($replyTo, FILTER_VALIDATE_EMAIL)
                ? $replyTo
                : $this->config['from_address']),
            'X-Mailer: PHP/' . PHP_VERSION,
        ];

        if ($isHtml) {
            $headers[] = 'MIME-Version: 1.0';
            $headers[] = 'Content-type: text/html; charset=utf-8';
        }

        return @mail($to, $subject, $body, implode("\r\n", $headers));
    }
}
