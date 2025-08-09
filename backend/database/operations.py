# =============================================================================
# CRITICAL FIX #3: Improved Database Operations
# File: database/operations.py - REWRITTEN FOR RELIABILITY AND CONSISTENCY
# =============================================================================

from sqlalchemy.orm import Session
from sqlalchemy import desc, func, and_, or_, text
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
import logging
import os
from .models import MusicGeneration, User, UsageStats, SystemMetrics, validate_generation_data

logger = logging.getLogger(__name__)

# =============================================================================
# ENHANCED DATABASE OPERATIONS CLASS
# =============================================================================

class DatabaseOperations:
    """
    FIXED Database operations with proper error handling and data consistency
    All methods now use standardized field names and proper validation
    """
    
    @staticmethod
    def create_generation_record(
        session: Session, 
        generation_data: Dict[str, Any],
        file_path: Optional[str] = None
    ) -> Optional[MusicGeneration]:
        """
        FIXED: Create generation record with proper validation and file size calculation
        """
        try:
            # Validate and clean input data
            clean_data = validate_generation_data(generation_data)
            
            # Calculate actual file size if file exists
            if file_path and os.path.exists(file_path):
                size_bytes = os.path.getsize(file_path)
                actual_size_mb = round(size_bytes / (1024 * 1024), 2)
                clean_data['file_size_mb'] = actual_size_mb
                clean_data['file_path'] = file_path
                
                # Generate audio URL
                filename = os.path.basename(file_path)
                clean_data['audio_url'] = f"/audio/{filename}"
            
            # Create database record with CONSISTENT field names
            generation = MusicGeneration(
                generation_id=clean_data['generation_id'],
                prompt=clean_data['prompt'],
                status=clean_data['status'],
                
                # FIXED: Use consistent field names (NO device_used, total_time)
                device=clean_data['device'],
                precision=clean_data['precision'],
                generation_time=clean_data['generation_time'],
                realtime_factor=clean_data['realtime_factor'],
                
                # File properties
                file_path=clean_data.get('file_path'),
                audio_url=clean_data.get('audio_url'),
                file_size_mb=clean_data['file_size_mb'],
                duration=clean_data['duration'],
                sample_rate=clean_data['sample_rate'],
                
                # User interaction defaults
                play_count=0,
                download_count=0,
                is_favorited=False,
                
                # Optional fields
                user_id=clean_data.get('user_id'),
                model_version=clean_data['model_version']
            )
            
            session.add(generation)
            session.commit()
            session.refresh(generation)
            
            logger.info(f"✅ Created generation record: {generation.generation_id} "
                       f"(device: {generation.device}, "
                       f"time: {generation.generation_time:.1f}s, "
                       f"size: {generation.file_size_mb:.1f}MB)")
            
            return generation
            
        except Exception as e:
            logger.error(f"❌ Failed to create generation record: {e}")
            session.rollback()
            return None
    
    @staticmethod
    def get_recent_generations(
        session: Session, 
        limit: int = 10,
        include_failed: bool = False
    ) -> List[Dict[str, Any]]:
        """
        FIXED: Get recent generations with consistent data structure
        """
        try:
            query = session.query(MusicGeneration)
            
            if not include_failed:
                query = query.filter(MusicGeneration.status == 'completed')
            
            generations = query.order_by(desc(MusicGeneration.created_at)).limit(limit).all()
            
            # Convert to dictionaries with CONSISTENT field names
            result = []
            for gen in generations:
                data = gen.to_dict()
                
                # Ensure file size is accurate
                if gen.file_path and os.path.exists(gen.file_path):
                    actual_size = gen.calculate_actual_file_size()
                    if actual_size != gen.file_size_mb:
                        gen.file_size_mb = actual_size
                        session.commit()
                        data['file_size_mb'] = actual_size
                
                result.append(data)
            
            logger.info(f"📚 Retrieved {len(result)} recent generations")
            return result
            
        except Exception as e:
            logger.error(f"❌ Failed to get recent generations: {e}")
            return []
    
    @staticmethod
    def get_most_played(session: Session, limit: int = 10) -> List[Dict[str, Any]]:
        """Get most played generations"""
        try:
            generations = (
                session.query(MusicGeneration)
                .filter(and_(
                    MusicGeneration.status == 'completed',
                    MusicGeneration.play_count > 0
                ))
                .order_by(desc(MusicGeneration.play_count))
                .limit(limit)
                .all()
            )
            
            result = [gen.to_dict() for gen in generations]
            logger.info(f"🔥 Retrieved {len(result)} most played generations")
            return result
            
        except Exception as e:
            logger.error(f"❌ Failed to get most played: {e}")
            return []
    
    @staticmethod
    def search_generations(
        session: Session, 
        query: str, 
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Search generations by prompt with full-text search"""
        try:
            # Use PostgreSQL full-text search if available
            try:
                generations = (
                    session.query(MusicGeneration)
                    .filter(and_(
                        MusicGeneration.status == 'completed',
                        func.to_tsvector('english', MusicGeneration.prompt)
                        .match(func.plainto_tsquery('english', query))
                    ))
                    .order_by(desc(MusicGeneration.created_at))
                    .limit(limit)
                    .all()
                )
            except Exception:
                # Fallback to simple ILIKE search
                generations = (
                    session.query(MusicGeneration)
                    .filter(and_(
                        MusicGeneration.status == 'completed',
                        MusicGeneration.prompt.ilike(f'%{query}%')
                    ))
                    .order_by(desc(MusicGeneration.created_at))
                    .limit(limit)
                    .all()
                )
            
            result = [gen.to_dict() for gen in generations]
            logger.info(f"🔍 Search '{query}' returned {len(result)} results")
            return result
            
        except Exception as e:
            logger.error(f"❌ Search failed: {e}")
            return []
    
    @staticmethod
    def record_play(
        session: Session, 
        generation_id: str, 
        play_duration: Optional[float] = None
    ) -> bool:
        """Record a play event with proper validation"""
        try:
            generation = (
                session.query(MusicGeneration)
                .filter(MusicGeneration.generation_id == generation_id)
                .first()
            )
            
            if not generation:
                logger.warning(f"⚠️ Generation not found for play tracking: {generation_id}")
                return False
            
            generation.increment_play_count()
            session.commit()
            
            logger.info(f"🎧 Play recorded: {generation_id} "
                       f"(count: {generation.play_count}, "
                       f"duration: {play_duration:.1f}s)" if play_duration else f"(count: {generation.play_count})")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to record play: {e}")
            session.rollback()
            return False
    
    @staticmethod
    def record_download(session: Session, generation_id: str) -> bool:
        """Record a download event"""
        try:
            generation = (
                session.query(MusicGeneration)
                .filter(MusicGeneration.generation_id == generation_id)
                .first()
            )
            
            if not generation:
                logger.warning(f"⚠️ Generation not found for download tracking: {generation_id}")
                return False
            
            generation.increment_download_count()
            session.commit()
            
            logger.info(f"💾 Download recorded: {generation_id} (count: {generation.download_count})")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to record download: {e}")
            session.rollback()
            return False
    
    @staticmethod
    def toggle_favorite(session: Session, generation_id: str) -> Optional[bool]:
        """Toggle favorite status and return new status"""
        try:
            generation = (
                session.query(MusicGeneration)
                .filter(MusicGeneration.generation_id == generation_id)
                .first()
            )
            
            if not generation:
                logger.warning(f"⚠️ Generation not found for favorite toggle: {generation_id}")
                return None
            
            new_status = generation.toggle_favorite()
            session.commit()
            
            logger.info(f"❤️ Favorite {'added' if new_status else 'removed'}: {generation_id}")
            return new_status
            
        except Exception as e:
            logger.error(f"❌ Failed to toggle favorite: {e}")
            session.rollback()
            return None
    
    @staticmethod
    def get_generation_stats(session: Session, days: int = 7) -> Dict[str, Any]:
        """Get comprehensive generation statistics"""
        try:
            # Calculate date range
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=days)
            
            # Base query for the time period
            base_query = session.query(MusicGeneration).filter(
                MusicGeneration.created_at >= start_date
            )
            
            # Basic counts
            total_generations = base_query.count()
            successful_generations = base_query.filter(
                MusicGeneration.status == 'completed'
            ).count()
            failed_generations = base_query.filter(
                MusicGeneration.status == 'failed'
            ).count()
            
            # Success rate
            success_rate = (successful_generations / max(total_generations, 1)) * 100
            
            # Performance metrics (only for successful generations)
            successful_gens = base_query.filter(
                MusicGeneration.status == 'completed'
            ).all()
            
            if successful_gens:
                avg_generation_time = sum(g.generation_time for g in successful_gens) / len(successful_gens)
                avg_realtime_factor = sum(g.realtime_factor for g in successful_gens) / len(successful_gens)
                total_file_size = sum(g.file_size_mb for g in successful_gens)
                avg_file_size = total_file_size / len(successful_gens)
            else:
                avg_generation_time = 0.0
                avg_realtime_factor = 0.0
                total_file_size = 0.0
                avg_file_size = 0.0
            
            # User engagement metrics
            total_plays = sum(g.play_count for g in successful_gens)
            total_downloads = sum(g.download_count for g in successful_gens)
            total_favorites = len([g for g in successful_gens if g.is_favorited])
            
            # Device usage breakdown
            device_stats = {}
            for gen in successful_gens:
                device = gen.device
                if device not in device_stats:
                    device_stats[device] = {'count': 0, 'avg_time': 0, 'total_time': 0}
                device_stats[device]['count'] += 1
                device_stats[device]['total_time'] += gen.generation_time
            
            # Calculate averages for device stats
            for device in device_stats:
                stats = device_stats[device]
                stats['avg_time'] = stats['total_time'] / stats['count']
                del stats['total_time']  # Remove total_time from output
            
            # Recent activity (last 24 hours)
            recent_start = end_date - timedelta(hours=24)
            recent_generations = session.query(MusicGeneration).filter(
                MusicGeneration.created_at >= recent_start
            ).count()
            
            stats = {
                "period_days": days,
                "total_generations": total_generations,
                "successful_generations": successful_generations,
                "failed_generations": failed_generations,
                "success_rate": round(success_rate, 2),
                "avg_generation_time": round(avg_generation_time, 2),
                "avg_realtime_factor": round(avg_realtime_factor, 2),
                "total_file_size_mb": round(total_file_size, 2),
                "avg_file_size_mb": round(avg_file_size, 2),
                "total_plays": total_plays,
                "total_downloads": total_downloads,
                "total_favorites": total_favorites,
                "device_breakdown": device_stats,
                "recent_24h_generations": recent_generations,
                "calculated_at": datetime.utcnow().isoformat()
            }
            
            logger.info(f"📊 Generated stats for {days} days: "
                       f"{total_generations} total, "
                       f"{success_rate:.1f}% success rate")
            
            return stats
            
        except Exception as e:
            logger.error(f"❌ Failed to get generation stats: {e}")
            return {
                "error": str(e),
                "period_days": days,
                "total_generations": 0,
                "successful_generations": 0,
                "failed_generations": 0,
                "success_rate": 0.0
            }
    
    @staticmethod
    def get_favorites(session: Session, limit: int = 50) -> List[Dict[str, Any]]:
        """Get user's favorite generations"""
        try:
            generations = (
                session.query(MusicGeneration)
                .filter(and_(
                    MusicGeneration.status == 'completed',
                    MusicGeneration.is_favorited == True
                ))
                .order_by(desc(MusicGeneration.created_at))
                .limit(limit)
                .all()
            )
            
            result = [gen.to_dict() for gen in generations]
            logger.info(f"❤️ Retrieved {len(result)} favorite generations")
            return result
            
        except Exception as e:
            logger.error(f"❌ Failed to get favorites: {e}")
            return []
    
    @staticmethod
    def cleanup_old_generations(
        session: Session, 
        days_to_keep: int = 30,
        keep_favorites: bool = True,
        dry_run: bool = True
    ) -> Dict[str, Any]:
        """Clean up old generation records and files"""
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)
            
            # Build deletion query
            query = session.query(MusicGeneration).filter(
                MusicGeneration.created_at < cutoff_date
            )
            
            if keep_favorites:
                query = query.filter(MusicGeneration.is_favorited == False)
            
            generations_to_delete = query.all()
            
            if dry_run:
                return {
                    "dry_run": True,
                    "generations_to_delete": len(generations_to_delete),
                    "cutoff_date": cutoff_date.isoformat(),
                    "keep_favorites": keep_favorites
                }
            
            # Actually delete records and files
            deleted_files = 0
            deleted_records = 0
            
            for gen in generations_to_delete:
                # Delete physical file if it exists
                if gen.file_path and os.path.exists(gen.file_path):
                    try:
                        os.remove(gen.file_path)
                        deleted_files += 1
                    except OSError as e:
                        logger.warning(f"⚠️ Failed to delete file {gen.file_path}: {e}")
                
                # Delete database record
                session.delete(gen)
                deleted_records += 1
            
            session.commit()
            
            logger.info(f"🧹 Cleanup completed: {deleted_records} records, {deleted_files} files")
            
            return {
                "dry_run": False,
                "deleted_records": deleted_records,
                "deleted_files": deleted_files,
                "cutoff_date": cutoff_date.isoformat(),
                "keep_favorites": keep_favorites
            }
            
        except Exception as e:
            logger.error(f"❌ Cleanup failed: {e}")
            session.rollback()
            return {"error": str(e)}
    
    @staticmethod
    def record_system_metrics(
        session: Session,
        metrics: Dict[str, Any]
    ) -> bool:
        """Record system performance metrics"""
        try:
            system_metric = SystemMetrics(
                cpu_usage=metrics.get('cpu_usage'),
                memory_usage=metrics.get('memory_usage'),
                gpu_usage=metrics.get('gpu_usage'),
                gpu_memory_usage=metrics.get('gpu_memory_usage'),
                disk_usage=metrics.get('disk_usage'),
                model_loaded=metrics.get('model_loaded', False),
                model_load_time=metrics.get('model_load_time'),
                active_generations=metrics.get('active_generations', 0),
                response_time_avg=metrics.get('response_time_avg'),
                error_rate=metrics.get('error_rate', 0.0),
                requests_per_minute=metrics.get('requests_per_minute', 0)
            )
            
            session.add(system_metric)
            session.commit()
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to record system metrics: {e}")
            session.rollback()
            return False
    
    @staticmethod
    def get_system_health(session: Session) -> Dict[str, Any]:
        """Get current system health status"""
        try:
            # Get latest system metrics
            latest_metric = (
                session.query(SystemMetrics)
                .order_by(desc(SystemMetrics.timestamp))
                .first()
            )
            
            # Get recent generation stats
            recent_gens = session.query(MusicGeneration).filter(
                MusicGeneration.created_at >= datetime.utcnow() - timedelta(hours=1)
            ).all()
            
            recent_success = len([g for g in recent_gens if g.status == 'completed'])
            recent_failed = len([g for g in recent_gens if g.status == 'failed'])
            recent_total = len(recent_gens)
            
            # Calculate health score (0-100)
            health_score = 100
            
            if latest_metric:
                if latest_metric.cpu_usage and latest_metric.cpu_usage > 80:
                    health_score -= 20
                if latest_metric.memory_usage and latest_metric.memory_usage > 85:
                    health_score -= 20
                if latest_metric.error_rate > 0.1:  # >10% error rate
                    health_score -= 30
            
            if recent_total > 0 and (recent_failed / recent_total) > 0.2:  # >20% failure rate
                health_score -= 30
            
            return {
                "health_score": max(0, health_score),
                "status": "healthy" if health_score >= 80 else "warning" if health_score >= 50 else "critical",
                "latest_metrics": latest_metric.to_dict() if latest_metric else None,
                "recent_activity": {
                    "total_generations": recent_total,
                    "successful": recent_success,
                    "failed": recent_failed,
                    "success_rate": (recent_success / max(recent_total, 1)) * 100
                },
                "checked_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to get system health: {e}")
            return {
                "health_score": 0,
                "status": "unknown",
                "error": str(e)
            }