"""Skill taxonomy service handling DAG graph traversals and prerequisite verification."""

from typing import Dict, List, Optional, Set, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.skill import Skill, SkillPrerequisite, SkillMastery
from app.schemas.skill import SkillTaxonomyNode


MASTERY_UNLOCK_THRESHOLD = 0.60
MASTERY_COMPLETE_THRESHOLD = 0.85


class SkillService:
    """Business logic for skill graph traversal, prerequisite DAG validation, and status resolution."""

    @staticmethod
    def get_all_skills(db: Session, category: Optional[str] = None) -> List[Skill]:
        """Fetch all skills optionally filtered by domain category."""
        query = db.query(Skill)
        if category:
            query = query.filter(Skill.category == category)
        return query.order_by(Skill.category, Skill.id).all()

    @staticmethod
    def get_skill_by_slug(db: Session, slug: str) -> Skill:
        """Fetch a single skill by slug or raise 404."""
        skill = db.query(Skill).filter(Skill.slug == slug).first()
        if not skill:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Skill with slug '{slug}' not found",
            )
        return skill

    @staticmethod
    def get_skill_by_id(db: Session, skill_id: int) -> Skill:
        """Fetch a single skill by integer ID or raise 404."""
        skill = db.query(Skill).filter(Skill.id == skill_id).first()
        if not skill:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Skill with id {skill_id} not found",
            )
        return skill

    @staticmethod
    def check_prerequisites_met(
        db: Session, user_id: int, skill_id: int
    ) -> Tuple[bool, List[str]]:
        """Verify whether all mandatory prerequisites for a skill are satisfied by user.

        Returns:
            Tuple of (is_satisfied: bool, list_of_unmet_skill_titles: List[str])
        """
        prereq_edges = (
            db.query(SkillPrerequisite)
            .filter(
                SkillPrerequisite.skill_id == skill_id,
                SkillPrerequisite.requirement_type == "mandatory",
            )
            .all()
        )

        if not prereq_edges:
            return True, []

        prereq_ids = [p.prerequisite_skill_id for p in prereq_edges]
        mastery_records = (
            db.query(SkillMastery)
            .filter(
                SkillMastery.user_id == user_id,
                SkillMastery.skill_id.in_(prereq_ids),
            )
            .all()
        )
        mastery_map = {m.skill_id: m.mastery_score for m in mastery_records}

        unmet: List[str] = []
        for edge in prereq_edges:
            score = mastery_map.get(edge.prerequisite_skill_id, 0.0)
            if score < MASTERY_UNLOCK_THRESHOLD:
                prereq_skill = db.query(Skill).filter(Skill.id == edge.prerequisite_skill_id).first()
                title = prereq_skill.title if prereq_skill else f"Skill #{edge.prerequisite_skill_id}"
                unmet.append(f"{title} (Mastery: {int(score * 100)}%, required: {int(MASTERY_UNLOCK_THRESHOLD * 100)}%)")

        return len(unmet) == 0, unmet

    @staticmethod
    def get_taxonomy_tree(db: Session, user_id: Optional[int] = None) -> List[SkillTaxonomyNode]:
        """Compile a complete taxonomy graph annotated with user mastery and lock status."""
        skills = db.query(Skill).all()
        prereqs = db.query(SkillPrerequisite).all()

        # Build adjacency maps
        skill_id_to_slug: Dict[int, str] = {s.id: s.slug for s in skills}
        prereqs_by_skill: Dict[int, List[str]] = {s.id: [] for s in skills}
        dependents_by_skill: Dict[int, List[str]] = {s.id: [] for s in skills}

        for p in prereqs:
            target_slug = skill_id_to_slug.get(p.skill_id)
            prereq_slug = skill_id_to_slug.get(p.prerequisite_skill_id)
            if target_slug and prereq_slug:
                prereqs_by_skill[p.skill_id].append(prereq_slug)
                dependents_by_skill[p.prerequisite_skill_id].append(target_slug)

        # User mastery lookup
        user_mastery_map: Dict[int, float] = {}
        if user_id:
            mastery_rows = db.query(SkillMastery).filter(SkillMastery.user_id == user_id).all()
            user_mastery_map = {m.skill_id: m.mastery_score for m in mastery_rows}

        nodes: List[SkillTaxonomyNode] = []
        for s in skills:
            mastery_score = user_mastery_map.get(s.id, 0.0)

            # Determine lock status based on prerequisites
            status_val = "unlocked"
            if user_id:
                is_met, _ = SkillService.check_prerequisites_met(db, user_id, s.id)
                if not is_met:
                    status_val = "locked"
                elif mastery_score >= MASTERY_COMPLETE_THRESHOLD:
                    status_val = "mastered"
                elif mastery_score > 0.0:
                    status_val = "in_progress"

            nodes.append(
                SkillTaxonomyNode(
                    id=s.id,
                    slug=s.slug,
                    title=s.title,
                    category=s.category,
                    description=s.description,
                    difficulty_level=s.difficulty_level,
                    prerequisite_slugs=prereqs_by_skill.get(s.id, []),
                    dependent_slugs=dependents_by_skill.get(s.id, []),
                    current_mastery=round(mastery_score, 2),
                    status=status_val,
                )
            )

        return nodes

    @staticmethod
    def validate_dag(db: Session) -> bool:
        """Topological sort cycle check to ensure prerequisite relations form a strictly valid DAG."""
        skills = db.query(Skill).all()
        prereqs = db.query(SkillPrerequisite).all()

        adj: Dict[int, List[int]] = {s.id: [] for s in skills}
        in_degree: Dict[int, int] = {s.id: 0 for s in skills}

        for p in prereqs:
            adj[p.prerequisite_skill_id].append(p.skill_id)
            in_degree[p.skill_id] += 1

        queue = [s_id for s_id, deg in in_degree.items() if deg == 0]
        visited_count = 0

        while queue:
            node = queue.pop(0)
            visited_count += 1
            for neighbor in adj.get(node, []):
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)

        return visited_count == len(skills)
