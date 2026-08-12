<?php

declare(strict_types=1);

final class Uploader
{
    private array $config;

    public function __construct()
    {
        $appConfig = require dirname(__DIR__) . '/config/app.php';
        $this->config = $appConfig['upload'];
    }

    public function upload(array $file, string $subfolder = 'general'): array
    {
        if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            return ['success' => false, 'message' => $this->uploadErrorMessage($file['error'] ?? UPLOAD_ERR_NO_FILE)];
        }

        if (($file['size'] ?? 0) > $this->config['max_size']) {
            return ['success' => false, 'message' => 'File exceeds maximum upload size.'];
        }

        $targetDir = rtrim($this->config['path'], '/') . '/' . trim($subfolder, '/');
        if (!is_dir($targetDir) && !mkdir($targetDir, 0755, true) && !is_dir($targetDir)) {
            return ['success' => false, 'message' => 'Upload directory could not be created. Check uploads permissions.'];
        }
        if (!is_writable($targetDir)) {
            return ['success' => false, 'message' => 'Upload directory is not writable. Run chmod -R 775 uploads on the API server.'];
        }

        if (!class_exists('finfo')) {
            return ['success' => false, 'message' => 'PHP fileinfo extension is required for uploads.'];
        }

        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file($file['tmp_name']) ?: '';

        if (!in_array($mime, $this->config['allowed_mimes'], true)) {
            return ['success' => false, 'message' => 'File type not allowed.'];
        }

        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($extension, $this->config['allowed_extensions'], true)) {
            return ['success' => false, 'message' => 'File extension not allowed.'];
        }

        $filename = bin2hex(random_bytes(16)) . '.' . $extension;
        $targetPath = $targetDir . '/' . $filename;

        if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
            return ['success' => false, 'message' => 'Failed to save uploaded file.'];
        }

        $relativePath = 'uploads/' . trim($subfolder, '/') . '/' . $filename;

        return [
            'success' => true,
            'path' => $relativePath,
            'filename' => $filename,
            'mime' => $mime,
            'size' => $file['size'],
        ];
    }

    public function delete(string $relativePath): bool
    {
        $fullPath = dirname(__DIR__) . '/' . ltrim($relativePath, '/');
        if (file_exists($fullPath) && is_file($fullPath)) {
            return unlink($fullPath);
        }
        return false;
    }

    private function uploadErrorMessage(int $code): string
    {
        return match ($code) {
            UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'File is too large.',
            UPLOAD_ERR_PARTIAL => 'File was only partially uploaded.',
            UPLOAD_ERR_NO_FILE => 'No file was uploaded.',
            UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder.',
            UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk.',
            UPLOAD_ERR_EXTENSION => 'Upload stopped by extension.',
            default => 'Unknown upload error.',
        };
    }
}
