<?php
session_start();
// Enable error reporting for debugging
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Log errors to a file
ini_set('log_errors', 1);
ini_set('error_log', _DIR_ . '/error_log.txt');

require_once 'config.php';
require_once 'class_access.php';

// Require authentication and verify page access
if (!isset($_SESSION['username']) || !isset($_SESSION['assigned_pages'])) {
    header('Location: index.php');
    exit;
}

$assignedPages = $_SESSION['assigned_pages'];
if (
    $_SESSION['roles'] !== 'admin' &&
    $_SESSION['roles'] !== 'super_admin' &&
    $assignedPages !== '*' &&
    !in_array('report.php', (array)$assignedPages, true)
) {
    header('Location: dashboard.php');
    exit;
}

// Function to get class teacher's signature for a class
function getClassTeacherSignature($pdo, $className, $debug = false) {
    if (empty($className)) return '';
    
    $classNameLower = strtolower(trim($className));
    $signaturePath = '';
    $foundStaffName = '';
    
    // FIRST: Check staff table for assigned class teacher/form master
    $stmt = $pdo->prepare("SELECT id, fullname, signature_path FROM staff WHERE LOWER(TRIM(assigned_class)) = ?");
    $stmt->execute([$classNameLower]);
    $staff = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($staff) {
        $foundStaffName = $staff['fullname'];
        if ($debug) {
            echo "<!-- DEBUG: Found staff '$foundStaffName' assigned to class '$className' -->\n";
        }
        
        // If staff has a signature_path directly
        if (!empty($staff['signature_path']) && file_exists(_DIR_ . '/' . $staff['signature_path'])) {
            $signaturePath = $staff['signature_path'];
        }
        // If staff is linked to a user, check user's signature
        elseif (!empty($staff['user_id'])) {
            $sigDir = _DIR_ . '/assets/signatures/';
            if (is_dir($sigDir)) {
                $patterns = [
                    $sigDir . 'sig_' . $staff['user_id'] . '_*.jpg',
                    $sigDir . 'sig_' . $staff['user_id'] . '_*.jpeg',
                    $sigDir . 'sig_' . $staff['user_id'] . '_*.png',
                    $sigDir . 'sig_' . $staff['user_id'] . '_*.gif',
                    $sigDir . 'sig_' . $staff['user_id'] . '.*'
                ];
                
                $allFiles = [];
                foreach ($patterns as $pattern) {
                    $files = glob($pattern);
                    if ($files) {
                        $allFiles = array_merge($allFiles, $files);
                    }
                }
                
                if (!empty($allFiles)) {
                    usort($allFiles, function($a, $b) { return filemtime($b) - filemtime($a); });
                    $signaturePath = 'assets/signatures/' . basename($allFiles[0]);
                }
            }
        }
        
        if (!empty($signaturePath)) {
            return $signaturePath;
        }
    }
    
    // FALLBACK: Check users table for assigned_classes (legacy behavior)
    $stmt = $pdo->prepare("SELECT id, assigned_classes, fullname FROM users WHERE roles NOT IN ('admin', 'super_admin')");
    $stmt->execute();
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $foundUserId = null;
    $foundUserName = '';
    
    foreach ($users as $user) {
        $assignedClasses = $user['assigned_classes'] ?? '';
        // Skip users with all classes (they're not specific class teachers)
        if ($assignedClasses === '*' || empty($assignedClasses)) {
            continue;
        }
        // Split by comma and check each class
        $classList = array_map('trim', explode(',', $assignedClasses));
        foreach ($classList as $assignedClass) {
            if (strtolower(trim($assignedClass)) === $classNameLower) {
                $foundUserId = $user['id'];
                $foundUserName = $user['fullname'];
                break 2;
            }
        }
    }
    
    if ($debug) {
        echo "<!-- DEBUG: Looking for class '$className', Found user ID: " . ($foundUserId ?? 'none') . " ($foundUserName) -->\n";
    }
    
    if ($foundUserId) {
        $sigDir = _DIR_ . '/assets/signatures/';
        if ($debug) {
            echo "<!-- DEBUG: Signature dir exists: " . (is_dir($sigDir) ? 'yes' : 'no') . " -->\n";
        }
        
        if (is_dir($sigDir)) {
            // Try multiple patterns to find signature file
            $patterns = [
                $sigDir . 'sig_' . $foundUserId . '_*.jpg',
                $sigDir . 'sig_' . $foundUserId . '_*.jpeg',
                $sigDir . 'sig_' . $foundUserId . '_*.png',
                $sigDir . 'sig_' . $foundUserId . '_*.gif',
                $sigDir . 'sig_' . $foundUserId . '.*'
            ];
            
            $allFiles = [];
            foreach ($patterns as $pattern) {
                $files = glob($pattern);
                if ($files) {
                    $allFiles = array_merge($allFiles, $files);
                }
            }
            
            if ($debug) {
                echo "<!-- DEBUG: Found " . count($allFiles) . " signature files for user $foundUserId -->\n";
                if (!empty($allFiles)) {
                    echo "<!-- DEBUG: Files: " . implode(', ', array_map('basename', $allFiles)) . " -->\n";
                }
            }
            
            if (!empty($allFiles)) {
                usort($allFiles, function($a, $b) { return filemtime($b) - filemtime($a); });
                return 'assets/signatures/' . basename($allFiles[0]);
            }
        }
    }
    return '';
}

// Function to get principal/head teacher signature (admin or super_admin)
function getPrincipalSignature($pdo) {
    // First try super_admin, then admin
    $stmt = $pdo->query("SELECT id FROM users WHERE roles IN ('super_admin', 'admin') ORDER BY FIELD(roles, 'super_admin', 'admin') LIMIT 1");
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($user) {
        $sigDir = _DIR_ . '/assets/signatures/';
        if (is_dir($sigDir)) {
            // Try multiple patterns to find signature file
            $patterns = [
                $sigDir . 'sig_' . $user['id'] . '_*.jpg',
                $sigDir . 'sig_' . $user['id'] . '_*.jpeg',
                $sigDir . 'sig_' . $user['id'] . '_*.png',
                $sigDir . 'sig_' . $user['id'] . '_*.gif',
                $sigDir . 'sig_' . $user['id'] . '.*'
            ];
            
            $allFiles = [];
            foreach ($patterns as $pattern) {
                $files = glob($pattern);
                if ($files) {
                    $allFiles = array_merge($allFiles, $files);
                }
            }
            
            if (!empty($allFiles)) {
                usort($allFiles, function($a, $b) { return filemtime($b) - filemtime($a); });
                return 'assets/signatures/' . basename($allFiles[0]);
            }
        }
    }
    return '';
}

$selectedClass = $_GET['class'] ?? '';
$selectedStudent = $_GET['student'] ?? '';
$selectedSession = trim($_GET['session'] ?? '');
$selectedTerm = trim($_GET['term'] ?? '');
$reportCards = [];

// Show user-friendly error if user tries to access a class without permission
$accessError = '';
if ($selectedClass && !has_class_access($selectedClass)) {
    $accessError = 'You do not have permission to access the selected class.';
    $selectedClass = '';
}

// Fetch classes available in the scoresheet
$classQuery = $pdo->query('SELECT DISTINCT class FROM scoresheet ORDER BY class ASC');
$allClasses = $classQuery ? $classQuery->fetchAll(PDO::FETCH_COLUMN) : [];
$classes = filter_accessible_classes($allClasses);

// Fetch active terms from session table
$activeTermsQuery = $pdo->query("SELECT DISTINCT term FROM session WHERE status = 1 ORDER BY FIELD(term, 'First Term', 'Second Term', 'Third Term')");
$termOptions = $activeTermsQuery ? $activeTermsQuery->fetchAll(PDO::FETCH_COLUMN) : ['First Term', 'Second Term', 'Third Term'];
$gradeKeyRows = [
    ['A', 'EXCELLENT', '70 - 100'],
    ['B', 'VERY GOOD', '60 - 69'],
    ['C', 'GOOD', '50 - 59'],
    ['D', 'PASS', '45 - 49'],
    ['E', 'FAIR', '40 - 44'],
    ['F', 'FAIL', '0 - 39'],
];

$gradeRemarkMap = [];
foreach ($gradeKeyRows as $row) {
    $gradeRemarkMap[$row[0]] = $row[1];
}

// Function to fetch auto remarks based on grade
function getAutoRemark($pdo, $remarkType, $grade) {
    if (empty($grade) || $grade === '-') {
        return '';
    }
    try {
        $stmt = $pdo->prepare("SELECT remark FROM teacher_remarks WHERE remark_type = ? AND grade = ? LIMIT 1");
        $stmt->execute([$remarkType, strtoupper($grade)]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $row['remark'] : '';
    } catch (PDOException $e) {
        return '';
    }
}

$affectiveCategories = [
    'HONESTY' => 'honesty',
    'PUNCTUAL' => 'punctuality',
    'ATTENDANCE' => 'attendance',
    'NEATNESS' => 'neatness',
    'SELF CONTROL' => 'self_control',
    'RESPECT' => 'respect',
];
$affectiveScale = ['A', 'B', 'C', 'D', 'E'];

if ($selectedTerm !== '' && !in_array($selectedTerm, $termOptions, true)) {
    $selectedTerm = '';
}

// Get current session/term as default (status = 1 means active)
$currentSessionRow = $pdo->query("SELECT session, term, term_closing_date, term_start_date FROM session WHERE status = 1 ORDER BY id DESC LIMIT 1")->fetch(PDO::FETCH_ASSOC);
$defaultSession = $currentSessionRow['session'] ?? '';
$defaultTerm = $currentSessionRow['term'] ?? '';
$defaultClosingDate = $currentSessionRow['term_closing_date'] ?? '';

// Fetch next term's start date
// Order: First Term -> Second Term -> Third Term, then next session's First Term
$nextTermDate = '';
if ($defaultTerm && $defaultSession) {
    $termOrder = ['First Term' => 1, 'Second Term' => 2, 'Third Term' => 3];
    $currentTermOrder = $termOrder[$defaultTerm] ?? 0;
    
    if ($currentTermOrder < 3) {
        // Get next term in same session
        $nextTermName = array_search($currentTermOrder + 1, $termOrder);
        $nextTermStmt = $pdo->prepare("SELECT term_start_date FROM session WHERE session = ? AND term = ? LIMIT 1");
        $nextTermStmt->execute([$defaultSession, $nextTermName]);
        $nextTermRow = $nextTermStmt->fetch(PDO::FETCH_ASSOC);
        $nextTermDate = $nextTermRow['term_start_date'] ?? '';
    } else {
        // Get First Term of next session
        $nextSessionStmt = $pdo->prepare("SELECT term_start_date FROM session WHERE session > ? AND term = 'First Term' ORDER BY session ASC LIMIT 1");
        $nextSessionStmt->execute([$defaultSession]);
        $nextSessionRow = $nextSessionStmt->fetch(PDO::FETCH_ASSOC);
        $nextTermDate = $nextSessionRow['term_start_date'] ?? '';
    }
}
$defaultNextTermDate = $nextTermDate;

if ($selectedSession === '') {
    $selectedSession = $defaultSession;
}

if ($selectedTerm === '') {
    $selectedTerm = $defaultTerm;
}

$students = [];
if ($selectedClass) {
    $studentStmt = $pdo->prepare(
        'SELECT sr.id AS adm_no, sr.fullname, sr.gender
         FROM students_register sr
         WHERE sr.class_history = ?
         ORDER BY sr.fullname ASC'
    );
    $studentStmt->execute([$selectedClass]);
    $studentRows = $studentStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

    $studentMap = [];
    foreach ($studentRows as $row) {
        if (empty($row['fullname'])) {
            $row['fullname'] = $row['adm_no'];
        }
        // Use string key to avoid type mismatches
        $studentMap[strval($row['adm_no'])] = $row;
    }

    $fallbackStmt = $pdo->prepare(
        'SELECT DISTINCT sc.adm_no, COALESCE(sc.fullname, sc.adm_no) AS fullname, NULL AS gender
         FROM scoresheet sc
         WHERE sc.class = ?
         ORDER BY fullname ASC'
    );
    $fallbackStmt->execute([$selectedClass]);
    foreach ($fallbackStmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        if (empty($row['fullname'])) {
            $row['fullname'] = $row['adm_no'];
        }
        // Use string key to avoid type mismatches
        $key = strval($row['adm_no']);
        if (!isset($studentMap[$key])) {
            $studentMap[$key] = $row;
        }
    }

    $students = array_values($studentMap);
    usort($students, function ($a, $b) {
        return strcasecmp($a['fullname'] ?? '', $b['fullname'] ?? '');
    });
}

$studentIds = array_column($students, 'adm_no');
// Convert to strings for comparison since GET params are strings
$studentIdsStr = array_map('strval', $studentIds);
$classSize = count($studentIds);

// Batch view only when no specific student is selected
$batchView = empty($selectedStudent);
$canRender = $selectedClass && $selectedSession && $selectedTerm;

if ($canRender) {
    if ($batchView) {
        $batchTargets = $studentIds;

        if (empty($batchTargets)) {
            $uniqueStmt = $pdo->prepare(
                'SELECT DISTINCT adm_no FROM scoresheet WHERE class = ? ORDER BY adm_no ASC'
            );
            $uniqueStmt->execute([$selectedClass]);
            $batchTargets = $uniqueStmt->fetchAll(PDO::FETCH_COLUMN) ?: [];
        }

        foreach ($batchTargets as $admNo) {
            $card = fetch_report_card($pdo, $selectedClass, $admNo, $selectedSession, $selectedTerm);
            if ($card) {
                $reportCards[] = $card;
            }
        }
        
        // Sort batch view by position_in_class (ascending)
        usort($reportCards, function($a, $b) {
            $posA = $a['summary']['position_in_class'] ?? PHP_INT_MAX;
            $posB = $b['summary']['position_in_class'] ?? PHP_INT_MAX;
            // Convert to integers for proper comparison
            $posA = is_numeric($posA) ? (int)$posA : PHP_INT_MAX;
            $posB = is_numeric($posB) ? (int)$posB : PHP_INT_MAX;
            return $posA - $posB;
        });
    } else {
        $singleCard = fetch_report_card($pdo, $selectedClass, $selectedStudent, $selectedSession, $selectedTerm);
        if ($singleCard) {
            $reportCards[] = $singleCard;
        }
    }
}

function get_level_style($className)
{
    $upper = strtoupper($className);

    if (strpos($upper, 'NURSERY') === 0) {
        return ['Nursery', '#FFFFFF', '#000000', '#000000'];
    }

    if (strpos($upper, 'JSS') === 0) {
        return ['Junior Secondary', '#FFFFFF', '#000000', '#000000'];
    }

    if (strpos($upper, 'SSS') === 0) {
        return ['Senior Secondary', '#FFFFFF', '#000000', '#000000'];
    }
    
    // Upper Basic and Post Basic are Secondary section
    if (strpos($upper, 'UPPER BASIC') !== false || strpos($upper, 'POST BASIC') !== false) {
        return ['Secondary', '#FFFFFF', '#000000', '#000000'];
    }

    return ['Primary', '#FFFFFF', '#000000', '#000000'];
}

function fetch_report_card(PDO $pdo, $className, $admNo, $sessionName, $termName)
{
    $detailsStmt = $pdo->prepare(
        'SELECT COALESCE(sr.id, sc.adm_no) AS adm_no,
                COALESCE(sr.fullname, sc.fullname, sc.adm_no) AS fullname,
                sr.gender
         FROM scoresheet sc
         LEFT JOIN students_register sr ON sr.id = sc.adm_no
         WHERE sc.class = ? AND sc.adm_no = ? AND (sc.session = ? OR sc.session IS NULL) AND (sc.term = ? OR sc.term IS NULL)
         LIMIT 1'
    );
    $detailsStmt->execute([$className, $admNo, $sessionName, $termName]);
    $student = $detailsStmt->fetch(PDO::FETCH_ASSOC);

    if (!$student) {
        return null;
    }

    $scoreStmt = $pdo->prepare(
        'SELECT subject, ca1, ca2, exam, total, grade, position_in_subject
         FROM scoresheet
         WHERE class = ? AND adm_no = ? AND (session = ? OR session IS NULL) AND (term = ? OR term IS NULL)
         ORDER BY subject ASC'
    );
    $scoreStmt->execute([$className, $admNo, $sessionName, $termName]);
    $scores = $scoreStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

    $summaryStmt = $pdo->prepare(
        'SELECT overall_total, average, position_in_class, overall_grade
         FROM scoresheet
         WHERE class = ? AND adm_no = ? AND (session = ? OR session IS NULL) AND (term = ? OR term IS NULL)
         LIMIT 1'
    );
    $summaryStmt->execute([$className, $admNo, $sessionName, $termName]);
    $summary = $summaryStmt->fetch(PDO::FETCH_ASSOC) ?: null;

    $affective = null;
    try {
        $affStmt = $pdo->prepare(
            'SELECT honesty, punctuality, attendance, neatness, self_control, respect,
                class_teacher_remark, form_teacher_remark, director_remark, next_term_begins
             FROM affective_assessments
             WHERE class = ? AND adm_no = ? AND academic_session = ? AND term = ?
             ORDER BY updated_at DESC
             LIMIT 1'
        );
        $affStmt->execute([$className, $admNo, $sessionName, $termName]);
        $affective = $affStmt->fetch(PDO::FETCH_ASSOC) ?: null;
    } catch (PDOException $e) {
        $affective = null;
    }

    return [
        'student' => $student,
        'scores' => $scores,
        'summary' => $summary,
        'affective' => $affective,
        'session' => $sessionName,
        'term' => $termName,
    ];
}

function format_position($position)
{
    if ($position === null || $position === '') {
        return '-';
    }

    if (!is_numeric($position)) {
        return (string)$position;
    }

    $number = (int)$position;
    $suffix = 'th';
    if ($number % 100 < 11 || $number % 100 > 13) {
        switch ($number % 10) {
            case 1:
                $suffix = 'st';
                break;
            case 2:
                $suffix = 'nd';
                break;
            case 3:
                $suffix = 'rd';
                break;
        }
    }

    return $number . $suffix;
}

function calculate_ca_total(array $score)
{
    $total = 0;
    foreach ($score as $key => $value) {
        if (stripos($key, 'ca') === 0 && is_numeric($value)) {
            $total += (float)$value;
        }
    }

    return $total;
}

function determine_default_session_term(PDO $pdo, array $termOptions)
{
    $session = '';
    $term = '';

    try {
        $stmt = $pdo->query(
            "SELECT academic_session, term FROM affective_assessments
             WHERE academic_session IS NOT NULL AND academic_session <> ''
             ORDER BY updated_at DESC LIMIT 1"
        );
        $row = $stmt ? $stmt->fetch(PDO::FETCH_ASSOC) : null;
        if ($row) {
            $sessionCandidate = trim((string)$row['academic_session']);
            if ($sessionCandidate !== '') {
                $session = $sessionCandidate;
            }

            $termCandidate = trim((string)$row['term']);
            if ($termCandidate !== '') {
                foreach ($termOptions as $option) {
                    if (strcasecmp($termCandidate, $option) === 0) {
                        $term = $option;
                        break;
                    }
                }

                if ($term === '') {
                    $term = $termCandidate;
                }
            }
        }
    } catch (PDOException $e) {
        // Table or column may not be available yet; ignore and fall back.
    }

    if ($session === '') {
        $session = guess_default_session_label();
    }

    if ($term === '' || !in_array($term, $termOptions, true)) {
        $term = guess_default_term_label($termOptions);
    }

    return [$session, $term];
}

function guess_default_session_label()
{
    $year = (int)date('Y');
    $month = (int)date('n');

    if ($month >= 9) {
        $start = $year;
        $end = $year + 1;
    } else {
        $start = $year - 1;
        $end = $year;
    }

    return $start . '/' . $end;
}

function guess_default_term_label(array $termOptions)
{
    if (empty($termOptions)) {
        return '';
    }

    $month = (int)date('n');
    if ($month >= 9) {
        $guess = 'First Term';
    } elseif ($month >= 1 && $month <= 3) {
        $guess = 'Second Term';
    } else {
        $guess = 'Third Term';
    }

    foreach ($termOptions as $option) {
        if (strcasecmp($option, $guess) === 0) {
            return $option;
        }
    }

    return $termOptions[0];
}

[$levelLabel, $bgColor, $accentColor, $textColor] = $selectedClass
    ? get_level_style($selectedClass)
    : ['Primary', '#FFFFFF', '#000000', '#000000'];


$page_title = 'Report Card | Progressive Academy';
$logo_force_white = true;
require_once _DIR_ . '/includes/header.php';

// DEBUG: Show current filter values at the top of the page
echo '<div style="background:#fffbe6;border:1px solid #ffe58f;padding:8px 12px;margin-bottom:10px;font-size:1rem;color:#333;">';
echo '<strong>DEBUG FILTERS:</strong> ';
echo 'Session: <b>' . htmlspecialchars($selectedSession) . '</b> | ';
echo 'Term: <b>' . htmlspecialchars($selectedTerm) . '</b> | ';
echo 'Class: <b>' . htmlspecialchars($selectedClass) . '</b> | ';
echo 'Student: <b>' . htmlspecialchars($selectedStudent) . '</b>';
echo '</div>';

// Check if viewing single student report (hide filters)
$singleStudentView = !empty($selectedStudent);
?>
        <div class="card-section">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h3>Report Cards</h3>
                <div>
                    <?php if ($singleStudentView): ?>
                        <a href="javascript:history.back()" class="btn btn-outline-secondary me-2">Back</a>
                    <?php endif; ?>
                    <?php if (!empty($reportCards)): ?>
                        <button class="btn btn-outline-secondary" onclick="window.print();">Print</button>
                    <?php endif; ?>
                </div>
            </div>

            <?php if (!empty($accessError)): ?>
                <div class="alert alert-danger text-center mb-3"> <?= htmlspecialchars($accessError) ?> </div>
            <?php endif; ?>
            <?php if (!$singleStudentView): ?>
            <form method="get" class="mb-4 report-filter">
                <div class="report-filter-row-group d-block d-md-none">
                    <div class="report-filter-row">
                        <label class="form-label fw-semibold mb-0">Session</label>
                        <select name="session" class="form-select" required style="max-width:180px;">
                            <?php
                            $sessionOptionsQuery = $pdo->query("SELECT DISTINCT session FROM session ORDER BY session DESC");
                            $sessionOptions = $sessionOptionsQuery ? $sessionOptionsQuery->fetchAll(PDO::FETCH_COLUMN) : [];
                            foreach ($sessionOptions as $session): ?>
                                <option value="<?= htmlspecialchars($session) ?>" <?= $selectedSession === $session ? 'selected' : '' ?>>
                                    <?= htmlspecialchars($session) ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="report-filter-row">
                        <label class="form-label fw-semibold mb-0">Term</label>
                        <select name="term" class="form-select" required style="max-width:180px;">
                            <option value="">-- Choose --</option>
                            <?php foreach ($termOptions as $term): ?>
                                <option value="<?= htmlspecialchars($term) ?>" <?= $selectedTerm === $term ? 'selected' : '' ?>>
                                    <?= htmlspecialchars($term) ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="report-filter-row">
                        <label class="form-label fw-semibold mb-0">Class</label>
                        <select name="class" class="form-select" required style="max-width:180px;">
                            <option value="">-- Choose --</option>
                            <?php foreach ($classes as $class): ?>
                                <option value="<?= htmlspecialchars($class) ?>" <?= $selectedClass === $class ? 'selected' : '' ?>>
                                    <?= htmlspecialchars($class) ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="report-filter-row d-flex align-items-center" style="gap: 8px;">
                        <button type="submit" class="btn btn-primary flex-shrink-0">Load</button>
                        <?php if ($selectedClass && $classSize > 0): ?>
                            <span class="badge bg-secondary ms-2" style="font-size:0.95em;"> <?= $classSize ?> students</span>
                        <?php endif; ?>
                    </div>
                </div>
                <div class="d-none d-md-flex" style="flex-wrap:nowrap; justify-content:center; align-items:center; gap:15px;">
                    <div style="display:inline-flex; align-items:center; gap:5px;">
                            <label class="form-label fw-semibold mb-0">Session</label>
                            <select name="session" class="form-select" required style="width:110px;">
                                <?php
                                $sessionOptionsQuery = $pdo->query("SELECT DISTINCT session FROM session ORDER BY session DESC");
                                $sessionOptions = $sessionOptionsQuery ? $sessionOptionsQuery->fetchAll(PDO::FETCH_COLUMN) : [];
                                foreach ($sessionOptions as $session): ?>
                                    <option value="<?= htmlspecialchars($session) ?>" <?= $selectedSession === $session ? 'selected' : '' ?>>
                                        <?= htmlspecialchars($session) ?>
                                    </option>
                                <?php endforeach; ?>
                            </select>
                    </div>
                    <div style="display:inline-flex; align-items:center; gap:5px;">
                        <label class="form-label fw-semibold mb-0">Term</label>
                        <select name="term" class="form-select" required style="width:130px;">
                            <option value="">-- Choose --</option>
                            <?php foreach ($termOptions as $term): ?>
                                <option value="<?= htmlspecialchars($term) ?>" <?= $selectedTerm === $term ? 'selected' : '' ?>>
                                    <?= htmlspecialchars($term) ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div style="display:inline-flex; align-items:center; gap:5px;">
                        <label class="form-label fw-semibold mb-0">Class</label>
                        <select name="class" class="form-select" required style="width:140px;">
                            <option value="">-- Choose --</option>
                            <?php foreach ($classes as $class): ?>
                                <option value="<?= htmlspecialchars($class) ?>" <?= $selectedClass === $class ? 'selected' : '' ?>>
                                    <?= htmlspecialchars($class) ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <button type="submit" class="btn btn-primary">Load</button>
                </div>
            </form>
            <?php endif; ?>

            <?php if ($selectedClass && empty($students)): ?>
                <div class="alert alert-warning text-center">No students found for <?= htmlspecialchars($selectedClass) ?>. Please check your filter selection.</div>
            <?php endif; ?>

            <?php if (!empty($reportCards)): ?>
                <?php foreach ($reportCards as $card): ?>
                    <?php
                    $student = $card['student'];
                    $scores = $card['scores'];
                    $summary = $card['summary'];
                    $affective = is_array($card['affective'] ?? null) ? $card['affective'] : [];
                    $genderValue = $student['gender'] ?? '';
                    $genderDisplay = ($genderValue === null || $genderValue === '') ? '-' : htmlspecialchars($genderValue);
                    $sessionLabel = $card['session'] ?: 'N/A';
                    $termLabel = $card['term'] ?: 'N/A';
                    $classStrength = $classSize > 0 ? (string)$classSize : '-';

                    $overallTotalDisplay = ($summary && $summary['overall_total'] !== null)
                        ? number_format((float)$summary['overall_total'])
                        : '-';
                    $averageDisplay = ($summary && $summary['average'] !== null)
                        ? number_format((float)$summary['average'], 2)
                        : '-';
                    $positionDisplay = ($summary && $summary['position_in_class'] !== null)
                        ? format_position($summary['position_in_class'])
                        : '-';
                    $overallGradeDisplay = ($summary && $summary['overall_grade'] !== null && $summary['overall_grade'] !== '')
                        ? $summary['overall_grade']
                        : '-';

                    $affectiveRatings = [];
                    foreach ($affectiveCategories as $label => $key) {
                        $affectiveRatings[$label] = strtoupper((string)($affective[$key] ?? ''));
                    }

                    $nextTermDisplay = '-';
                    if (!empty($affective['next_term_begins']) && $affective['next_term_begins'] !== '0000-00-00') {
                        $timestamp = strtotime($affective['next_term_begins']);
                        if ($timestamp) {
                            $nextTermDisplay = date('F j, Y', $timestamp);
                        }
                    }

                    $classRemarkText = trim((string)($affective['class_teacher_remark'] ?? ''));
                    $formRemarkText = trim((string)($affective['form_teacher_remark'] ?? ''));
                    $directorRemarkText = trim((string)($affective['director_remark'] ?? ''));

                    // Get auto remarks based on overall grade if manual remarks are empty
                    $studentGrade = $overallGradeDisplay !== '-' ? $overallGradeDisplay : '';
                    $autoClassTeacherRemark = getAutoRemark($pdo, 'class_teacher', $studentGrade);
                    $autoDirectorRemark = getAutoRemark($pdo, 'director', $studentGrade);

                    $showClassRemark = in_array($levelLabel, ['Nursery', 'Primary'], true);
                    $showFormRemark = in_array($levelLabel, ['Junior Secondary', 'Senior Secondary', 'Secondary'], true);

                    if ($showClassRemark) {
                        $teacherRemarkLabel = "Class Teacher's Remark";
                        // Use manual remark if available, otherwise use auto remark
                        $teacherRemarkContent = $classRemarkText !== '' 
                            ? htmlspecialchars($classRemarkText) 
                            : htmlspecialchars($autoClassTeacherRemark);
                    } elseif ($showFormRemark) {
                        $teacherRemarkLabel = "Form Master's Remark";
                        // Use manual remark if available, otherwise use auto remark
                        $teacherRemarkContent = $formRemarkText !== '' 
                            ? htmlspecialchars($formRemarkText) 
                            : htmlspecialchars($autoClassTeacherRemark);
                    } else {
                        $teacherRemarkLabel = "Teacher's Remark";
                        $teacherRemarkContent = htmlspecialchars($autoClassTeacherRemark);
                    }
                    
                    // Use manual director remark if available, otherwise use auto remark
                    $directorRemarkContent = $directorRemarkText !== ''
                        ? htmlspecialchars($directorRemarkText)
                        : htmlspecialchars($autoDirectorRemark);
                    
                    // Set remark label based on level: Head Teacher for Nursery/Primary, Principal for Secondary
                    if (in_array($levelLabel, ['Nursery', 'Primary'], true)) {
                        $directorRemarkLabel = "Head Teacher's Remarks";
                        $directorSignatureLabel = "Head Teacher's Signature";
                    } else {
                        $directorRemarkLabel = "Principal's Remarks";
                        $directorSignatureLabel = "Principal's Signature";
                    }
                    
                    // Set class teacher signature label based on level
                    if (in_array($levelLabel, ['Nursery', 'Primary'], true)) {
                        $teacherSignatureLabel = "Class Teacher's Signature";
                    } else {
                        $teacherSignatureLabel = "Form Master's Signature";
                    }
                    
                    // Get signature images (set second param to true to enable debug output in HTML comments)
                    $debugSignatures = isset($_GET['debug_sig']) && $_GET['debug_sig'] === '1';
                    $classTeacherSignature = getClassTeacherSignature($pdo, $selectedClass, $debugSignatures);
                    $principalSignature = getPrincipalSignature($pdo);
                        
                    $levelSectionText = strtoupper($levelLabel);
                    $sectionTitle = 'TERMINAL REPORT CARD FOR ' . $levelSectionText . ' SECTION';
                    $classHeading = $selectedClass !== '' ? strtoupper($selectedClass) : 'CLASS';
                    $termHeading = $termLabel !== '' ? strtoupper($termLabel) : 'TERM';
                    $sessionHeading = $sessionLabel !== '' ? strtoupper($sessionLabel) . ' SESSION' : 'SESSION';
                    $brandSubtitle = trim($classHeading . ', ' . $termHeading . ' ' . $sessionHeading);
                    ?>
                    <div class="report-card">
                        <div class="report-branding">
                            <div class="brand-row">
                                <div class="brand-logo brand-logo-left">
                                    <img src="logo.png" alt="School Logo" loading="lazy">
                                </div>
                                <div class="brand-details">
                                    <h2>Progressive Academy for Basic and Secondary Education</h2>
                                    <p>Faskari Road by Dandaji, Funtua, Katsina State, Nigeria</p>
                                    <p class="brand-motto">Motto: Knowledge is Light</p>
                                </div>
                                <div class="brand-logo brand-logo-right">
                                    <img src="logo.png" alt="School Logo" loading="lazy">
                                </div>
                            </div>
                            <div class="brand-center">
                                <div class="brand-title"><?= htmlspecialchars($sectionTitle) ?></div>
                                <div class="brand-subtitle"><?= htmlspecialchars($brandSubtitle) ?></div>
                            </div>
                        </div>
                        <hr class="section-divider">

                        <div class="student-info">
                            <div class="info-row">
                                <span class="info-item info-item-wide">Student Name: <span><?= htmlspecialchars($student['fullname']) ?></span></span>
                                <span class="info-item">Admission No.: <span><?= htmlspecialchars($student['adm_no']) ?></span></span>
                                <span class="info-item">Gender: <span><?= $genderDisplay ?></span></span>
                            </div>
                            <div class="info-row">
                                <span class="info-item">Total Marks: <span><?= htmlspecialchars($overallTotalDisplay) ?></span></span>
                                <span class="info-item">Average: <span><?= htmlspecialchars($averageDisplay) ?></span></span>
                                <span class="info-item">Position: <span><?= htmlspecialchars($positionDisplay) ?></span></span>
                                <span class="info-item">No. in Class: <span><?= htmlspecialchars($classStrength) ?></span></span>
                                <span class="info-item">Grade: <span><?= htmlspecialchars($overallGradeDisplay) ?></span></span>
                            </div>
                        </div>
                        <hr class="section-divider">

                        <div class="results-section">
                            <div class="results-table">
                                <h5 class="results-table-title">Academic Progress Report</h5>
                                <table class="table table-bordered table-hover report-table">
                                    <thead>
                                        <tr>
                                            <th>Subject</th>
                                            <th>CA</th>
                                            <th>Exam</th>
                                            <th>Total</th>
                                            <th>Grade</th>
                                            <th>Remarks</th>
                                            <th>Position</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <?php if (!empty($scores)): ?>
                                            <?php foreach ($scores as $score): ?>
                                                <?php
                                                $caTotal = calculate_ca_total($score);
                                                $caHasValue = false;
                                                foreach ($score as $scoreKey => $scoreValue) {
                                                    if (stripos($scoreKey, 'ca') === 0 && $scoreValue !== null && $scoreValue !== '') {
                                                        $caHasValue = true;
                                                        break;
                                                    }
                                                }
                                                $caDisplay = $caHasValue ? number_format((float)$caTotal, 0) : '-';

                                                $examRaw = $score['exam'] ?? null;
                                                $examDisplay = ($examRaw === null || $examRaw === '') ? '-' : number_format((float)$examRaw, 0);

                                                $totalRaw = $score['total'] ?? null;
                                                $totalDisplay = ($totalRaw === null || $totalRaw === '') ? '-' : number_format((float)$totalRaw, 0);

                                                $gradeRaw = strtoupper(trim((string)($score['grade'] ?? '')));
                                                $gradeDisplay = $gradeRaw !== '' ? $gradeRaw : '-';
                                                $gradeRemarkDisplay = $gradeRaw !== '' ? ($gradeRemarkMap[$gradeRaw] ?? '-') : '-';

                                                $subjectPosition = $score['position_in_subject'] ?? null;
                                                $subjectPositionDisplay = ($subjectPosition === null || $subjectPosition === '')
                                                    ? '-'
                                                    : format_position($subjectPosition);
                                                ?>
                                                <tr>
                                                    <td><?= htmlspecialchars($score['subject'] ?? '-') ?></td>
                                                    <td><?= htmlspecialchars($caDisplay) ?></td>
                                                    <td><?= htmlspecialchars($examDisplay) ?></td>
                                                    <td><?= htmlspecialchars($totalDisplay) ?></td>
                                                    <td><?= htmlspecialchars($gradeDisplay) ?></td>
                                                    <td><?= htmlspecialchars($gradeRemarkDisplay) ?></td>
                                                    <td><?= htmlspecialchars($subjectPositionDisplay) ?></td>
                                                </tr>
                                            <?php endforeach; ?>
                                        <?php else: ?>
                                            <tr>
                                                <td colspan="7" class="text-center">No subject scores available.</td>
                                            </tr>
                                        <?php endif; ?>
                                    </tbody>
                                </table>
                            </div>
                            <div class="side-panels">
                                <div class="grade-key">
                                    <h5>Grading Key</h5>
                                    <table class="table table-sm table-bordered grade-key-table">
                                        <thead>
                                            <tr>
                                                <th>Grade</th>
                                                <th>Remarks</th>
                                                <th>Marks</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <?php foreach ($gradeKeyRows as $row): ?>
                                                <tr>
                                                    <td><?= htmlspecialchars($row[0]) ?></td>
                                                    <td><?= htmlspecialchars($row[1]) ?></td>
                                                    <td><?= htmlspecialchars($row[2]) ?></td>
                                                </tr>
                                            <?php endforeach; ?>
                                        </tbody>
                                    </table>
                                </div>
                                <div class="affective-panel">
                                    <h5>Affective Assessment</h5>
                                    <table class="table table-bordered table-sm affective-table">
                                        <thead>
                                            <tr>
                                                <th>TRAIT</th>
                                                <?php foreach ($affectiveScale as $scaleLetter): ?>
                                                    <th><?= htmlspecialchars($scaleLetter) ?></th>
                                                <?php endforeach; ?>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <?php foreach ($affectiveCategories as $label => $key): ?>
                                                <?php $rating = $affectiveRatings[$label] ?? ''; ?>
                                                <tr>
                                                    <td><?= htmlspecialchars($label) ?></td>
                                                    <?php foreach ($affectiveScale as $scaleLetter): ?>
                                                        <?php $isActive = $rating === $scaleLetter; ?>
                                                        <td class="<?= $isActive ? 'affective-active' : '' ?>"><?= $isActive ? htmlspecialchars($scaleLetter) : '&nbsp;' ?></td>
                                                    <?php endforeach; ?>
                                                </tr>
                                            <?php endforeach; ?>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                        <hr class="section-divider">

                        <div class="report-bottom">
                            <div class="remarks-full">
                                <div class="remark-row">
                                    <span class="remark-label"><?= htmlspecialchars($teacherRemarkLabel) ?>:</span>
                                    <span class="remark-text"><?= $teacherRemarkContent !== '' ? $teacherRemarkContent : '&nbsp;' ?></span>
                                </div>
                                <div class="remark-row">
                                    <span class="remark-label"><?= htmlspecialchars($directorRemarkLabel) ?>:</span>
                                    <span class="remark-text"><?= $directorRemarkContent !== '' ? $directorRemarkContent : '&nbsp;' ?></span>
                                </div>
                            </div>
                            <div class="dates-row">
                                <div class="date-item">
                                    <span class="date-label">Closing Date:</span>
                                    <span class="date-value"><?php
                                        $closingDateDisplay = '-';
                                        if (!empty($defaultClosingDate) && $defaultClosingDate !== '0000-00-00') {
                                            $closingTimestamp = strtotime($defaultClosingDate);
                                            if ($closingTimestamp) {
                                                $closingDateDisplay = date('F j, Y', $closingTimestamp);
                                            }
                                        }
                                        echo htmlspecialchars($closingDateDisplay);
                                    ?></span>
                                </div>
                                <div class="date-item">
                                    <span class="date-label">Next Term Begins:</span>
                                    <span class="date-value"><?php
                                        $nextTermDateDisplay = '-';
                                        if (!empty($defaultNextTermDate) && $defaultNextTermDate !== '0000-00-00') {
                                            $nextTermTimestamp = strtotime($defaultNextTermDate);
                                            if ($nextTermTimestamp) {
                                                $nextTermDateDisplay = date('F j, Y', $nextTermTimestamp);
                                            }
                                        }
                                        echo htmlspecialchars($nextTermDateDisplay);
                                    ?></span>
                                </div>
                            </div>
                            <div class="signatures-row">
                                <div class="signature-box">
                                    <?php if ($classTeacherSignature): ?>
                                        <img src="<?= htmlspecialchars($classTeacherSignature) ?>" alt="Class Teacher Signature" class="signature-image">
                                    <?php else: ?>
                                        <span class="signature-line"></span>
                                    <?php endif; ?>
                                    <span class="signature-caption"><?= htmlspecialchars($teacherSignatureLabel) ?></span>
                                </div>
                                <div class="signature-box stamp-box">
                                    <span class="signature-line"></span>
                                    <span class="signature-caption">Official Stamp</span>
                                </div>
                                <div class="signature-box">
                                    <?php if ($principalSignature): ?>
                                        <img src="<?= htmlspecialchars($principalSignature) ?>" alt="Principal Signature" class="signature-image">
                                    <?php else: ?>
                                        <span class="signature-line"></span>
                                    <?php endif; ?>
                                    <span class="signature-caption"><?= htmlspecialchars($directorSignatureLabel) ?></span>
                                </div>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>
            <?php elseif ($canRender): ?>
                <div class="alert alert-danger text-center">No report data available for this selection.</div>
            <?php endif; ?>
        </div>

<style>
.report-card {
    background: #ffffff;
    color: #000000;
    padding: 24px;
    border: 6px solid #000000;
    border-image: repeating-linear-gradient(
        45deg,
        #000000 0px,
        #000000 2px,
        #ffffff 2px,
        #ffffff 4px,
        #000000 4px,
        #000000 6px,
        #ffffff 6px,
        #ffffff 8px
    ) 6;
    max-width: calc(8.27in - 1in);
    width: 100%;
    margin: 0 auto;
    box-sizing: border-box;
    overflow-x: hidden;
    position: relative;
}

.report-card::before {
    content: '';
    position: absolute;
    top: 4px;
    left: 4px;
    right: 4px;
    bottom: 4px;
    border: 1px solid #000000;
    pointer-events: none;
}

.report-card + .report-card {
    margin-top: 36px;
}

.report-branding {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.brand-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
}

.brand-logo img {
    width: 65px;
    height: 65px;
    object-fit: contain;
}

.brand-details {
    text-align: center;
    flex: 1 1 auto;
}

.brand-details h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
    color: #0d47a1;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.brand-details p {
    margin: 2px 0;
    font-size: 0.9rem;
}

.brand-motto {
    margin-top: 6px;
    font-style: italic;
}

.brand-center {
    text-align: center;
    margin-top: 4px;
}

.brand-title {
    font-size: 1.08rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #1b5e20;
}

.brand-subtitle {
    font-size: 1rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    margin-top: 4px;
    text-transform: uppercase;
}

.section-divider {
    border: 0;
    border-top: 1px solid #000000;
    margin: 14px 0;
}

.student-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    font-size: 0.96rem;
}

.info-row {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 16px;
    text-align: center;
}

.info-item {
    display: inline-flex;
    align-items: baseline;
    gap: 4px;
    font-weight: 600;
    white-space: nowrap;
}

.info-item span {
    font-weight: 500;
}

.info-item-wide {
    min-width: auto;
    justify-content: center;
}

.results-section {
    display: flex;
    gap: 20px;
    align-items: flex-start;
    margin-bottom: 18px;
    width: 100%;
    box-sizing: border-box;
}

.results-table {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
}

.results-table-title {
    font-weight: 700;
    font-size: 0.95rem;
    margin-bottom: 10px;
    text-align: left;
}

.side-panels {
    flex: 0 0 200px;
    max-width: 200px;
    min-width: 160px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    box-sizing: border-box;
    padding-top: 8px;
}

.side-panels h5 {
    font-weight: 700;
    font-size: 0.85rem;
    margin-bottom: 6px;
    text-align: center;
}

.grade-key-table td:first-child {
    text-align: center;
    font-weight: 600;
}

.report-table {
    width: 100%;
    border: 2px solid #000000;
    border-collapse: collapse;
}

.report-table th,
.report-table td {
    border: 1px solid #000000;
    vertical-align: middle;
    font-size: 0.82rem;
    text-align: center;
    padding: 4px 3px;
}

.report-table th {
    background: none !important;
    color: #000000 !important;
    font-weight: 700;
    font-size: 0.8rem;
}

.report-table td:first-child {
    text-align: left;
    font-weight: 600;
}

.grade-key-table,
.affective-table {
    width: 100%;
    border: 2px solid #000000;
    border-collapse: collapse;
}

.grade-key-table th,
.grade-key-table td,
.affective-table th,
.affective-table td {
    border: 1px solid #000000;
    text-align: center;
    vertical-align: middle;
    font-size: 0.7rem;
    color: #000000;
    padding: 2px 1px;
    white-space: nowrap;
}

.grade-key-table th,
.affective-table th {
    background: none !important;
    color: #000000 !important;
    font-weight: 700;
}

.affective-table td:first-child {
    text-align: left;
    font-weight: 600;
}

.affective-active {
    font-weight: 700;
}

.report-bottom {
    display: flex;
    flex-direction: column;
    gap: 20px;
    margin: 20px 0;
}

.remarks-full {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.remark-row {
    display: flex;
    gap: 8px;
    font-size: 0.95rem;
    align-items: center;
    width: 100%;
}

.remark-label {
    font-weight: 600;
    white-space: nowrap;
}

.remark-text {
    flex: 1 1 auto;
    border-bottom: 1px solid #000000;
    min-height: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 8px;
    text-align: center;
}

.dates-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
    font-size: 0.9rem;
    flex-wrap: nowrap;
}

.date-item {
    display: flex;
    gap: 6px;
    align-items: center;
    white-space: nowrap;
}

.date-label {
    font-weight: 700;
}

.date-value {
    font-weight: 400;
}

.signatures-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 20px;
    margin-top: 30px;
    padding-top: 40px;
}

.signature-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    flex: 1;
    max-width: 200px;
}

.signature-box.stamp-box {
    flex: 0 0 auto;
    max-width: 150px;
}

.signature-line {
    display: inline-block;
    width: 100%;
    height: 1px;
    background: #111111;
}

.signature-image {
    max-width: 120px;
    max-height: 50px;
    object-fit: contain;
    margin-bottom: 4px;
}

.signature-caption {
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    text-align: center;
    font-weight: 700;
}

.report-filter .form-label {
    color: #000000;
}

@media (max-width: 768px) {
    .card-section {
        padding: 10px 5px !important;
    }
    
    .report-card {
        padding: 10px;
        border-width: 3px;
        font-size: 0.65rem;
    }
    
    .report-card::before {
        top: 2px;
        left: 2px;
        right: 2px;
        bottom: 2px;
    }

    .brand-row {
        gap: 8px;
    }
    
    .brand-logo img {
        width: 40px;
        height: 40px;
    }
    
    .brand-details h2 {
        font-size: 0.7rem;
    }
    
    .brand-details p {
        font-size: 0.55rem;
        margin: 1px 0;
    }
    
    .brand-motto {
        margin-top: 2px;
    }
    
    .brand-title {
        font-size: 0.6rem;
    }
    
    .brand-subtitle {
        font-size: 0.55rem;
    }
    
    .section-divider {
        margin: 8px 0;
    }

    .student-info {
        font-size: 0.6rem;
        gap: 2px;
    }
    
    .info-row {
        gap: 8px;
    }
    
    .info-item {
        font-size: 0.55rem;
        gap: 2px;
    }

    .results-section {
        flex-direction: row;
        gap: 8px;
        align-items: flex-start;
    }
    
    .results-table {
        flex: 1 1 auto;
        min-width: 0;
    }
    
    .results-table-title {
        font-size: 0.6rem;
        margin-bottom: 4px;
    }
    
    .report-table th,
    .report-table td {
        font-size: 0.5rem;
        padding: 2px 1px;
    }
    
    .report-table td:first-child {
        font-size: 0.5rem;
    }

    .side-panels {
        flex: 0 0 100px;
        max-width: 100px;
        min-width: 80px;
        gap: 6px;
        padding-top: 0;
    }
    
    .side-panels h5 {
        font-size: 0.5rem;
        margin-bottom: 3px;
    }
    
    .grade-key-table th,
    .grade-key-table td,
    .affective-table th,
    .affective-table td {
        font-size: 0.4rem;
        padding: 1px;
    }

    .report-bottom {
        gap: 8px;
        margin: 8px 0;
    }
    
    .remarks-full {
        gap: 4px;
    }
    
    .remark-row {
        font-size: 0.55rem;
        gap: 4px;
    }
    
    .remark-label {
        font-size: 0.5rem;
    }
    
    .remark-text {
        min-height: 16px;
        font-size: 0.5rem;
    }

    .dates-row {
        gap: 10px;
        font-size: 0.55rem;
    }
    
    .date-label, .date-value {
        font-size: 0.5rem;
    }

    .signatures-row {
        gap: 10px;
        margin-top: 15px;
        padding-top: 20px;
    }

    .signature-box {
        max-width: 80px;
    }
    
    .signature-image {
        max-width: 50px;
        max-height: 25px;
    }
    
    .signature-caption {
        font-size: 0.4rem;
    }
    
    .signature-line {
        width: 60px;
    }
}

@page {
    size: 8.27in 11.69in;
    margin: 0.5in;
}

@media print {
    body {
        background: #ffffff !important;
    }

    .navbar,
    .footer,
    .report-filter,
    .btn,
    .alert,
    .card-section > .d-flex {
        display: none !important;
    }

    .card-section {
        padding: 0 !important;
    }

    .report-card {
        box-shadow: none;
        border: 1px solid #000000;
        page-break-inside: avoid;
    }

    .report-card + .report-card {
        page-break-before: always;
        margin-top: 32px;
    }
}
</style>
<?php require_once _DIR_ . '/includes/footer.php'; ?>