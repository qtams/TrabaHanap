<?php

namespace Tests\Unit;

use App\Services\ResumeAi;
use PHPUnit\Framework\TestCase;
use ReflectionMethod;

class ProfileShapeTest extends TestCase
{
    public function test_skills_are_grouped_and_unknown_choices_emptied(): void
    {
        $shape = (new ReflectionMethod(ResumeAi::class, 'toProfileShape'))->invoke(null, [
            'summary' => ['employment_status' => 'retired'],
            'experience' => [['employment_type' => 'full_time'], ['employment_type' => 'gig']],
            'skills' => [
                ['name' => 'React', 'category' => 'frameworks'],
                ['name' => 'React', 'category' => 'frameworks'],
                ['name' => 'Customer Service', 'category' => 'nonsense'],
                ['name' => ' ', 'category' => 'tools'],
            ],
        ]);

        $this->assertSame(['React'], $shape['skills']['frameworks']);
        $this->assertSame(['Customer Service'], $shape['skills']['other']);
        $this->assertSame([], $shape['skills']['tools']);
        $this->assertCount(8, $shape['skills']);
        $this->assertSame('', $shape['summary']['employment_status']);
        $this->assertSame(['full_time', ''], array_column($shape['experience'], 'employment_type'));
    }
}
