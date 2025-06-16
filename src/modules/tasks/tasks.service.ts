// import { Injectable, NotFoundException } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { Task } from './entities/task.entity';
// import { CreateTaskDto } from './dto/create-task.dto';
// import { UpdateTaskDto } from './dto/update-task.dto';
// import { InjectQueue } from '@nestjs/bullmq';
// import { Queue } from 'bullmq';
// import { TaskStatus } from './enums/task-status.enum';

// @Injectable()
// export class TasksService {
//   // constructor(
//   //   @InjectRepository(Task)
//   //   private tasksRepository: Repository<Task>,
//   //   @InjectQueue('task-processing')
//   //   private taskQueue: Queue,
//   // ) {}
//  constructor(
//     @InjectQueue('task-processing') private taskQueue: Queue,
//     @InjectRepository(Task) private taskRepository: Repository<Task>,
//   ) {}
//   async create(createTaskDto: CreateTaskDto): Promise<Task> {
//     // Inefficient implementation: creates the task but doesn't use a single transaction
//     // for creating and adding to queue, potential for inconsistent state
//     const task = this.taskRepository.create(createTaskDto);
//     const savedTask = await this.taskRepository.save(task);

//     // Add to queue without waiting for confirmation or handling errors
//     this.taskQueue.add('task-status-update', {
//       taskId: savedTask.id,
//       status: savedTask.status,
//     });

//     return savedTask;
//   }

//   async findAll(): Promise<Task[]> {
//     // Inefficient implementation: retrieves all tasks without pagination
//     // and loads all relations, causing potential performance issues
//     return this.taskRepository.find({
//       relations: ['user'],
//     });
//   }

//   async findOne(id: string): Promise<Task> {
//     // Inefficient implementation: two separate database calls
//     const count = await this.taskRepository.count({ where: { id } });

//     if (count === 0) {
//       throw new NotFoundException(`Task with ID ${id} not found`);
//     }

//     return (await this.taskRepository.findOne({
//       where: { id },
//       relations: ['user'],
//     })) as Task;
//   }

//   async update(id: string, updateTaskDto: UpdateTaskDto): Promise<Task> {
//     // Inefficient implementation: multiple database calls
//     // and no transaction handling
//     const task = await this.findOne(id);

//     const originalStatus = task.status;

//     // Directly update each field individually
//     if (updateTaskDto.title) task.title = updateTaskDto.title;
//     if (updateTaskDto.description) task.description = updateTaskDto.description;
//     if (updateTaskDto.status) task.status = updateTaskDto.status;
//     if (updateTaskDto.priority) task.priority = updateTaskDto.priority;
//     if (updateTaskDto.dueDate) task.dueDate = updateTaskDto.dueDate;

//     const updatedTask = await this.taskRepository.save(task);

//     // Add to queue if status changed, but without proper error handling
//     if (originalStatus !== updatedTask.status) {
//       this.taskQueue.add('task-status-update', {
//         taskId: updatedTask.id,
//         status: updatedTask.status,
//       });
//     }

//     return updatedTask;
//   }

//   async remove(id: string): Promise<void> {
//     // Inefficient implementation: two separate database calls
//     const task = await this.findOne(id);
//     await this.taskRepository.remove(task);
//   }

//   async findByStatus(status: TaskStatus): Promise<Task[]> {
//     // Inefficient implementation: doesn't use proper repository patterns
//     const query = 'SELECT * FROM tasks WHERE status = $1';
//     return this.taskRepository.query(query, [status]);
//   }

//   async updateStatus(id: string, status: string): Promise<Task> {
//     // This method will be called by the task processor
//     const task = await this.findOne(id);
//     task.status = status as any;
//     return this.taskRepository.save(task);
//   }
// }
// import { Injectable, NotFoundException } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { InjectQueue } from '@nestjs/bullmq';
// import { Queue } from 'bullmq';
// import { Task } from './entities/task.entity';
// import { CreateTaskDto } from './dto/create-task.dto';
// import { UpdateTaskDto } from './dto/update-task.dto';
// import { TaskStatus } from './enums/task-status.enum';
// import { TaskPriority } from './enums/task-priority.enum';
// import { error } from 'console';

// @Injectable()
// export class TasksService {
//   constructor(
//     @InjectQueue('task-processing') private taskQueue: Queue,
//     @InjectRepository(Task) private taskRepository: Repository<Task>,
//   ) {}

//   async create(dto: CreateTaskDto): Promise<Task> {
//     const task = this.taskRepository.create(dto);
//     const saved = await this.taskRepository.save(task);
//     await this.taskQueue.add('task-status-update', {
//       taskId: saved.id,
//       status: saved.status,
//     });
//     return saved;
//   }

//   async findAllWithFilters({
//     status,
//     priority,
//     page = 1,
//     limit = 10,
//   }: {
//     status?: TaskStatus;
//     priority?: TaskPriority;
//     page?: number;
//     limit?: number;
//   }) {
//     const [tasks, count] = await this.taskRepository.findAndCount({
//       where: {
//         ...(status && { status }),
//         ...(priority && { priority }),
//       },
//       take: limit,
//       skip: (page - 1) * limit,
//       relations: ['user'],
//       order: { createdAt: 'DESC' },
//     });
//     return { data: tasks, total: count, page, limit };
//   }

//   async findOne(id: string): Promise<Task> {
//     const task = await this.taskRepository.findOne({
//       where: { id },
//       relations: ['user'],
//     });
//     if (!task) throw new NotFoundException('Task not found');
//     return task;
//   }
//   async updateStatus(id: string, status: TaskStatus): Promise<Task> {
//     const task = await this.taskRepository.findOne({ where: { id } });
//     if (!task) {
//       throw new NotFoundException(`Task with ID ${id} not found`);
//     }

//     task.status = status;
//     return this.taskRepository.save(task);
//   }
//   async update(id: string, dto: UpdateTaskDto): Promise<Task> {
//     const task = await this.findOne(id);
//     Object.assign(task, dto);
//     const updated = await this.taskRepository.save(task);
//     if (dto.status && dto.status !== task.status) {
//       await this.taskQueue.add('task-status-update', {
//         taskId: updated.id,
//         status: updated.status,
//       });
//     }
//     return updated;
//   }

//   async remove(id: string): Promise<void> {
//     const task = await this.findOne(id);
//     await this.taskRepository.remove(task);
//   }

//   // async getStatistics() {
//   //   const [all, completed, inProgress, pending, highPriority] = await Promise.all([
//   //     this.taskRepository.count(),
//   //     this.taskRepository.count({ where: { status: TaskStatus.COMPLETED } }),
//   //     this.taskRepository.count({ where: { status: TaskStatus.IN_PROGRESS } }),
//   //     this.taskRepository.count({ where: { status: TaskStatus.PENDING } }),
//   //     this.taskRepository.count({ where: { priority: TaskPriority.HIGH } }),
//   //   ]);
//   //   return { total: all, completed, inProgress, pending, highPriority };
//   // }
//    async getStatistics(): Promise<any> {
//   return this.taskRepository
//     .createQueryBuilder('task')
//     .select('COUNT(*)', 'total')
//     .addSelect(`COUNT(*) FILTER (WHERE task.status = :completed)`, 'completed')
//     .addSelect(`COUNT(*) FILTER (WHERE task.status = :inProgress)`, 'inProgress')
//     .addSelect(`COUNT(*) FILTER (WHERE task.status = :pending)`, 'pending')
//     .addSelect(`COUNT(*) FILTER (WHERE task.priority = :high)`, 'highPriority')
//     .setParameters({
//       completed: TaskStatus.COMPLETED,
//       inProgress: TaskStatus.IN_PROGRESS,
//       pending: TaskStatus.PENDING,
//       high: TaskPriority.HIGH,
//     })
//     .getRawOne();
// }

//   async batchProcess({ tasks, action }: { tasks: string[]; action: 'complete' | 'delete' }) {
//     const results = [];
//     for (const id of tasks) {
//       try {
//         let result;
//         if (action === 'complete') {
//           result = await this.update(id, { status: TaskStatus.COMPLETED });
//         } else if (action === 'delete') {
//           await this.remove(id);
//           result = { deleted: true };
//         }
//         results.push({ id, success: true, result });
//       } catch (e) {
//         results.push({ id, success: false, error:e });
//       }
//     }
//     return results;
//   }
// }

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Task } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskStatus } from './enums/task-status.enum';
import { TaskPriority } from './enums/task-priority.enum';
import { error } from 'console';

@Injectable()
export class TasksService {
  constructor(
    @InjectQueue('task-processing') private taskQueue: Queue,
    @InjectRepository(Task) private taskRepository: Repository<Task>,
  ) {}

async create(dto: CreateTaskDto & { userId: string }): Promise<Task> {
  const task = this.taskRepository.create(dto);
  const saved = await this.taskRepository.save(task);
  await this.taskQueue.add('task-status-update', {
    taskId: saved.id,
    status: saved.status,
  });
  return saved;
}
  async updateStatus(id: string, status: TaskStatus): Promise<Task> {
    const task = await this.taskRepository.findOne({ where: { id } });
    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    task.status = status;
    return this.taskRepository.save(task);
  }
async findAllWithFilters({
  status,
  priority,
  page = 1,
  limit = 10,
  userId,
}: {
  status?: TaskStatus;
  priority?: TaskPriority;
  page?: number;
  limit?: number;
  userId: string;
}) {
  const [tasks, count] = await this.taskRepository.findAndCount({
    where: {
      userId,
      ...(status && { status }),
      ...(priority && { priority }),
    },
    take: limit,
    skip: (page - 1) * limit,
    order: { createdAt: 'DESC' },
  });
  return { data: tasks, total: count, page, limit };
}

async findOne(id: string, userId: string): Promise<Task> {
  const task = await this.taskRepository.findOne({
    where: { id, userId },
  });
  if (!task) throw new NotFoundException('Task not found or access denied');
  return task;
}

async update(id: string, dto: UpdateTaskDto, userId: string): Promise<Task> {
  const task = await this.findOne(id, userId);
  Object.assign(task, dto);
  const updated = await this.taskRepository.save(task);
  if (dto.status && dto.status !== task.status) {
    await this.taskQueue.add('task-status-update', {
      taskId: updated.id,
      status: updated.status,
    });
  }
  return updated;
}

async remove(id: string, userId: string): Promise<void> {
  const task = await this.findOne(id, userId);
  await this.taskRepository.remove(task);
}

async batchProcess(
  { tasks, action }: { tasks: string[]; action: 'complete' | 'delete' },
  userId: string,
) {
  const results = [];
  for (const id of tasks) {
    try {
      let result;
      if (action === 'complete') {
        result = await this.update(id, { status: TaskStatus.COMPLETED }, userId);
      } else if (action === 'delete') {
        await this.remove(id, userId);
        result = { deleted: true };
      }
      results.push({ id, success: true, result });
    } catch (e) {
      results.push({ id, success: false, error: e });
    }
  }
  return results;
}

async getStatistics(userId: string): Promise<any> {
  return this.taskRepository
    .createQueryBuilder('task')
    .select('COUNT(*)', 'total')
    .addSelect(`COUNT(*) FILTER (WHERE task.status = :completed)`, 'completed')
    .addSelect(`COUNT(*) FILTER (WHERE task.status = :inProgress)`, 'inProgress')
    .addSelect(`COUNT(*) FILTER (WHERE task.status = :pending)`, 'pending')
    .addSelect(`COUNT(*) FILTER (WHERE task.priority = :high)`, 'highPriority')
    .where('task.userId = :userId', { userId })
    .setParameters({
      completed: TaskStatus.COMPLETED,
      inProgress: TaskStatus.IN_PROGRESS,
      pending: TaskStatus.PENDING,
      high: TaskPriority.HIGH,
    })
    .getRawOne();
}
}
