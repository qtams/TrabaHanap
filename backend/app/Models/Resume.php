<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class Resume extends Model
{
    protected $fillable = [
        'user_id', 'title', 'file_path', 'file_name', 'mime_type', 'file_size',
        'data', 'analysis', 'extracted_at', 'analyzed_at',
        'tailored_from_id', 'job_title', 'job_description', 'tailoring_notes',
    ];

    protected $hidden = ['file_path'];

    protected function casts(): array
    {
        return [
            'data' => 'array',
            'analysis' => 'array',
            'tailoring_notes' => 'array',
            'extracted_at' => 'datetime',
            'analyzed_at' => 'datetime',
        ];
    }

    public function tailoredFrom(): BelongsTo
    {
        return $this->belongsTo(self::class, 'tailored_from_id');
    }

    public function isPdf(): bool
    {
        return $this->mime_type === 'application/pdf';
    }

    // Delete the stored file along with the row.
    protected static function booted(): void
    {
        static::deleted(function (Resume $resume) {
            if ($resume->file_path) {
                Storage::disk('local')->delete($resume->file_path);
            }
        });
    }
}
