// lib/jobService.ts
import { api } from './api';
import { 
  Job, 
  JobWithDetails, 
  JobFormData, 
  PaginatedJobsResponse,
  MaterialUsed,
  WasteExpense 
} from '@/types/jobs';

export const jobService = {
  async getAllJobs(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<PaginatedJobsResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);

    const response = await api.get(`/jobs?${queryParams.toString()}`);
    return response.data;
  },

  async getJobById(id: string): Promise<JobWithDetails> {
    const response = await api.get(`/jobs/${id}`);
    
    return {
      ...response.data.job,
      materials: response.data.materials || [],
      waste: response.data.waste || [],
      payments: response.data.payments || []
    };
  },

  async createJob(jobData: JobFormData): Promise<{ job: Job; message: string }> {
    const response = await api.post('/jobs', jobData);
    return response.data;
  },

  async updateJobStatus(
    jobId: string, 
    status: Job['status'], 
    materials?: MaterialUsed[], 
    waste?: WasteExpense[]
  ): Promise<void> {
    await api.patch(`/jobs/${jobId}/status`, { status, materials, waste });
  },

  async updateJob(jobId: string, jobData: Partial<Job>): Promise<Job> {
    const response = await api.put(`/jobs/${jobId}`, jobData);
    return response.data.job;
  },

  async deleteJob(jobId: string): Promise<void> {
    await api.delete(`/jobs/${jobId}`);
  },

  async getJobByTicketId(ticketId: string): Promise<Job> {
    const response = await api.get(`/jobs/ticket/${ticketId}`);
    return response.data.job;
  }
};