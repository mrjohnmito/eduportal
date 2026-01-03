-- Drop existing policies for classes table
DROP POLICY IF EXISTS "Admins can insert classes in their school" ON public.classes;
DROP POLICY IF EXISTS "Admins can update classes in their school" ON public.classes;
DROP POLICY IF EXISTS "Admins can delete classes in their school" ON public.classes;

-- Create new policies that allow both admins and super admins

-- Insert policy: admins for their school OR super admins for any school
CREATE POLICY "Admins and super admins can insert classes"
ON public.classes
FOR INSERT
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role) AND school_id = get_user_school_id(auth.uid()))
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- Update policy: admins for their school OR super admins for any school
CREATE POLICY "Admins and super admins can update classes"
ON public.classes
FOR UPDATE
USING (
  (has_role(auth.uid(), 'admin'::app_role) AND school_id = get_user_school_id(auth.uid()))
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- Delete policy: admins for their school OR super admins for any school
CREATE POLICY "Admins and super admins can delete classes"
ON public.classes
FOR DELETE
USING (
  (has_role(auth.uid(), 'admin'::app_role) AND school_id = get_user_school_id(auth.uid()))
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- Also update the SELECT policy to allow super admins to view all classes
DROP POLICY IF EXISTS "Authenticated users can view classes in their school" ON public.classes;

CREATE POLICY "Authenticated users can view classes"
ON public.classes
FOR SELECT
USING (
  school_id = get_user_school_id(auth.uid())
  OR has_role(auth.uid(), 'super_admin'::app_role)
);