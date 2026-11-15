<?php
declare(strict_types=1);

// Creates, edits, archives, or safely deletes projects linked to disbursements.
function handle_project(PDO $db, array $data, array $account): void
{
    $user = account_actor($account);
    $operation = $data['operation'] ?? '';
    if (!in_array($operation, ['create', 'update', 'archive', 'activate', 'delete'], true)) {
        throw new InvalidArgumentException('Choose a valid project action.');
    }

    $projectId = null;
    if ($operation !== 'create') {
        $projectId = filter_var($data['project_id'] ?? null, FILTER_VALIDATE_INT);
        if ($projectId === false || $projectId < 1) {
            throw new InvalidArgumentException('Select a valid project.');
        }
    }

    $db->beginTransaction();
    if ($operation === 'create' || $operation === 'update') {
        $projectName = required_string($data, 'project_name', 180);
        $startDate = valid_date($data, 'start_date');
        $endDate = valid_date($data, 'end_date');
        if ($startDate > $endDate) {
            throw new InvalidArgumentException('Project end date must be on or after the start date.');
        }

        if ($operation === 'update') {
            $select = $db->prepare('SELECT id FROM projects WHERE id = ? FOR UPDATE');
            $select->execute([$projectId]);
            if (!$select->fetch()) {
                throw new InvalidArgumentException('The selected project does not exist.');
            }
        }

        $duplicate = $db->prepare($operation === 'create'
            ? 'SELECT id FROM projects WHERE project_name = ? FOR UPDATE'
            : 'SELECT id FROM projects WHERE project_name = ? AND id <> ? FOR UPDATE'
        );
        $duplicate->execute($operation === 'create' ? [$projectName] : [$projectName, $projectId]);
        if ($duplicate->fetch()) {
            throw new InvalidArgumentException('A project with that name already exists.');
        }

        if ($operation === 'create') {
            $insert = $db->prepare('INSERT INTO projects (project_name, start_date, end_date) VALUES (?, ?, ?)');
            $insert->execute([$projectName, $startDate, $endDate]);
            $projectId = (int)$db->lastInsertId();
            $logDetail = 'Created project ' . $projectName;
        } else {
            $update = $db->prepare('UPDATE projects SET project_name = ?, start_date = ?, end_date = ? WHERE id = ?');
            $update->execute([$projectName, $startDate, $endDate, $projectId]);
            $logDetail = 'Updated project ' . $projectName;
        }
        log_action($db, $user, $operation === 'create' ? 'Created a project' : 'Updated a project', $logDetail);
    } else {
        $select = $db->prepare('SELECT id, project_name FROM projects WHERE id = ? FOR UPDATE');
        $select->execute([$projectId]);
        $project = $select->fetch();
        if (!$project) {
            throw new InvalidArgumentException('The selected project does not exist.');
        }

        if ($operation === 'delete') {
            $linked = $db->prepare('SELECT COUNT(*) FROM disbursements WHERE project_id = ?');
            $linked->execute([$projectId]);
            if ((int)$linked->fetchColumn() > 0) {
                throw new InvalidArgumentException('This project has financial records and cannot be deleted. Archive it instead.');
            }
            $delete = $db->prepare('DELETE FROM projects WHERE id = ?');
            $delete->execute([$projectId]);
            log_action($db, $user, 'Deleted a project', $project['project_name']);
        } else {
            $status = $operation === 'archive' ? 'archived' : 'active';
            $update = $db->prepare('UPDATE projects SET status = ? WHERE id = ?');
            $update->execute([$status, $projectId]);
            log_action(
                $db,
                $user,
                $operation === 'archive' ? 'Archived a project' : 'Reactivated a project',
                $project['project_name']
            );
        }
    }

    $db->commit();
    respond(['ok' => true, 'project_id' => $projectId], 200);
}
