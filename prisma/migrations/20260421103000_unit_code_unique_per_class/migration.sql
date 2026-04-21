-- Drop the global unique constraint for unit codes because different quarter classes can reuse the same unit code.
DROP INDEX "Unit_unitCode_key";

-- Enforce uniqueness only within the same quarter class.
CREATE UNIQUE INDEX "Unit_classId_unitCode_key" ON "Unit"("classId", "unitCode");
