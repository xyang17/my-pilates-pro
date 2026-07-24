-- ============================================================
-- 从 exercises-dataset 导入 118 条动作
-- 生成时间: 2026-07-24T06:24:24.373Z
-- 图片来自 Gym Visual (gymvisual.com)，非商业使用
-- ============================================================

BEGIN;

-- push-up [body weight]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'push-up', NULL,
  'Strength Training', '力量训练',
  'body weight', '自重',
  'pectorals', '胸肌',
  'Start in a high plank position with your hands slightly wider than shoulder-width apart and your feet together. Engage your core and lower your body towards the ground by bending your elbows, keeping your body in a straight line. Pause for a moment when your chest is just above the ground, then push yourself back up to the starting position by straightening your arms. Repeat for the desired number of repetitions.', '从高位平板支撑开始，双手分开略宽于肩宽，双脚并拢。 弯曲肘部，调动核心力量，将身体压向地面，保持身体呈一条直线。 当你的胸部刚好高于地面时，暂停片刻，然后伸直手臂，将自己推回起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0662-I4hDWkc.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- pull-up [body weight]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'pull-up', NULL,
  'Strength Training', '力量训练',
  'body weight', '自重',
  'lats', '背阔肌',
  'Hang from a pull-up bar with your palms facing away from you and your arms fully extended. Engage your core and squeeze your shoulder blades together. Pull your body up towards the bar by bending your elbows and bringing your chest towards the bar. Pause at the top of the movement, then slowly lower your body back down to the starting position. Repeat for the desired number of repetitions.', '悬挂在引体向上杆上，手掌背向自己，手臂完全伸展。 启动你的核心并将肩胛骨挤压在一起。 弯曲肘部并将胸部拉向杠铃杆，将身体向上拉向杠铃杆。 在动作的最高点暂停，然后慢慢降低身体回到起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0652-lBDjFxJ.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- chin-up [body weight]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'chin-up', NULL,
  'Strength Training', '力量训练',
  'body weight', '自重',
  'lats', '背阔肌',
  'Hang from a pull-up bar with your palms facing towards you and your hands shoulder-width apart. Engage your core and pull your body up towards the bar, leading with your chest. Continue pulling until your chin is above the bar. Pause for a moment at the top, then slowly lower your body back down to the starting position. Repeat for the desired number of repetitions.', '悬挂在引体向上杆上，手掌朝向自己，双手与肩同宽。 启动核心肌群，将身体拉向杠铃杆，以胸部为主导。 继续拉，直到下巴位于杠铃上方。 在顶部停顿片刻，然后慢慢将身体放回起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/1326-T2mxWqc.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- dead bug [body weight]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'dead bug', NULL,
  'Core Training', '核心训练',
  'body weight', '自重',
  'abs', '腹肌',
  'Lie flat on your back with your arms extended towards the ceiling. Bend your knees and lift your legs off the ground, creating a 90-degree angle at your hips and knees. Engage your core and lower back to press your lower back into the ground. Slowly lower your right arm and left leg towards the ground, keeping them straight and hovering just above the floor. Pause for a moment, then return to the starting position. Repeat the movement with your left arm and right leg. Continue alternating sides for the desired number of repetitions.', '平躺，双臂伸向天花板。 弯曲膝盖，将双腿抬离地面，使臀部和膝盖形成 90 度角。 接合你的核心和下背部，将你的下背部压入地面。 慢慢地将右臂和左腿放低至地面，保持它们伸直并悬停在地板上方。 暂停片刻，然后回到起始位置。 用左臂和右腿重复该动作。 继续交替进行所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0276-iny3m5y.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- mountain climber [body weight]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'mountain climber', NULL,
  'Warmup', '热身',
  'body weight', '自重',
  'cardiovascular system', 'cardiovascular system',
  'Start in a high plank position with your hands directly under your shoulders and your body in a straight line. Engage your core and bring your right knee towards your chest, then quickly switch and bring your left knee towards your chest. Continue alternating legs in a running motion, keeping your hips low and your core engaged. Maintain a steady pace and breathe evenly throughout the exercise. Repeat for the desired number of repetitions.', '从高平板支撑位置开始，双手直接放在肩膀下方，身体呈一条直线。 启动你的核心并将你的右膝盖靠近你的胸部，然后快速切换并将你的左膝盖靠近你的胸部。 继续以跑步动作交替双腿，保持臀部较低，核心肌群参与。 在整个练习过程中保持稳定的节奏和均匀的呼吸。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0630-RJgzwny.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- burpee [body weight]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'burpee', NULL,
  'Warmup', '热身',
  'body weight', '自重',
  'cardiovascular system', 'cardiovascular system',
  'Start in a standing position with your feet shoulder-width apart. Lower your body into a squat position by bending your knees and placing your hands on the floor in front of you. Kick your feet back into a push-up position. Perform a push-up, keeping your body in a straight line. Jump your feet back into the squat position. Jump up explosively, reaching your arms overhead. Land softly and immediately lower back into a squat position to begin the next repetition.', '从站立位置开始，双脚分开与肩同宽。 弯曲膝盖并将双手放在身前的地板上，将身体降低至蹲姿。 将脚踢回到俯卧撑位置。 进行俯卧撑，保持身体呈一条直线。 将双脚跳回蹲姿。 爆发性地跳起，将双臂举过头顶。 轻轻落地并立即回到蹲姿，开始下一次重复。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/1160-dK9394r.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- russian twist [body weight]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'russian twist', NULL,
  'Core Training', '核心训练',
  'body weight', '自重',
  'abs', '腹肌',
  'Sit on the ground with your knees bent and feet flat on the floor. Lean back slightly while keeping your back straight and your core engaged. Hold your hands together in front of your chest or hold a weight if desired. Lift your feet off the ground, balancing on your sit bones. Twist your torso to the right, bringing your hands or weight towards the right side of your body. Pause for a moment, then twist your torso to the left, bringing your hands or weight towards the left side of your body. Continue alternating sides for the desired number of repetitions.', '坐在地上，膝盖弯曲，双脚平放在地板上。 稍微向后倾斜，同时保持背部挺直并且核心参与。 如果需要，双手合拢放在胸前或举重物。 将脚抬离地面，在坐骨上保持平衡。 将你的躯干向右扭转，将你的手或重量移向身体的右侧。 暂停片刻，然后将躯干向左扭转，将手或体重移向身体的左侧。 继续交替进行所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0687-XVDdcoj.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- inchworm [body weight]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'inchworm', NULL,
  'Core Training', '核心训练',
  'body weight', '自重',
  'abs', '腹肌',
  'Start in a standing position with your feet hip-width apart. Bend forward at the waist and place your hands on the ground in front of you. Walk your hands forward until you are in a high plank position, with your body in a straight line from head to toe. Pause for a moment, then walk your hands back towards your feet, keeping your legs as straight as possible. Once your hands reach your feet, stand back up to the starting position. Repeat for the desired number of repetitions.', '从站立位置开始，双脚分开与臀部同宽。 腰部向前弯曲，双手放在身前的地面上。 双手向前移动，直到处于高位平板支撑位置，身体从头到脚成一条直线。 暂停片刻，然后将双手移回双脚，尽可能保持双腿伸直。 一旦你的手到达你的脚，站回起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/1471-ZgsNQ6d.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- bear crawl [body weight]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'bear crawl', NULL,
  'Warmup', '热身',
  'body weight', '自重',
  'cardiovascular system', 'cardiovascular system',
  'Start on all fours with your hands directly under your shoulders and your knees directly under your hips. Lift your knees slightly off the ground, keeping your back flat and your core engaged. Move your right hand and left foot forward simultaneously, followed by your left hand and right foot. Continue crawling forward, alternating your hand and foot movements. Maintain a steady pace and keep your core tight throughout the exercise. Continue for the desired distance or time.', '从四肢着地开始，双手直接放在肩膀下方，膝盖直接放在臀部下方。 将膝盖稍微抬离地面，保持背部平坦并收紧核心。 同时向前移动右手和左脚，然后是左手和右脚。 继续向前爬行，手脚交替动作。 在整个练习过程中保持稳定的节奏并保持核心紧张。 继续所需的距离或时间。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/3360-0Yz8WdV.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- 3/4 sit-up [body weight]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  '3/4 sit-up', NULL,
  'Core Training', '核心训练',
  'body weight', '自重',
  'abs', '腹肌',
  'Lie flat on your back with your knees bent and feet flat on the ground. Place your hands behind your head with your elbows pointing outwards. Engaging your abs, slowly lift your upper body off the ground, curling forward until your torso is at a 45-degree angle. Pause for a moment at the top, then slowly lower your upper body back down to the starting position. Repeat for the desired number of repetitions.', '平躺，膝盖弯曲，双脚平放在地上。 将双手放在脑后，肘部朝外。 收紧腹肌，慢慢将上半身抬离地面，向前卷曲，直到躯干呈 45 度角。 在顶部停顿片刻，然后慢慢将上半身放回起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0001-2gPfomN.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- 45° side bend [body weight]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  '45° side bend', NULL,
  'Core Training', '核心训练',
  'body weight', '自重',
  'abs', '腹肌',
  'Stand with your feet shoulder-width apart and your arms extended straight down by your sides. Keeping your back straight and your core engaged, slowly bend your torso to one side, lowering your hand towards your knee. Pause for a moment at the bottom, then slowly return to the starting position. Repeat on the other side. Continue alternating sides for the desired number of repetitions.', '双脚分开与肩同宽站立，双臂在身体两侧笔直向下伸展。 保持背部挺直，核心肌群参与，慢慢将躯干向一侧弯曲，将手向膝盖方向放低。 在底部停顿片刻，然后慢慢回到起始位置。 在另一侧重复。 继续交替进行所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0002-Hy9D21L.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- air bike [body weight]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'air bike', NULL,
  'Core Training', '核心训练',
  'body weight', '自重',
  'abs', '腹肌',
  'Lie flat on your back with your hands placed behind your head. Lift your legs off the ground and bend your knees at a 90-degree angle. Bring your right elbow towards your left knee while simultaneously straightening your right leg. Return to the starting position and repeat the movement on the opposite side, bringing your left elbow towards your right knee while straightening your left leg. Continue alternating sides in a pedaling motion for the desired number of repetitions.', '平躺，双手放在脑后。 将双腿抬离地面，并以 90 度角弯曲膝盖。 将右肘靠近左膝盖，同时伸直右腿。 返回起始位置，在另一侧重复该动作，将左肘拉向右膝盖，同时伸直左腿。 继续交替进行蹬踏动作，达到所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0003-1ZFqTDN.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- all fours squad stretch [body weight]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'all fours squad stretch', NULL,
  'Strength Training', '力量训练',
  'body weight', '自重',
  'quads', '股四头肌',
  'Start on all fours with your hands directly under your shoulders and your knees directly under your hips. Extend one leg straight back, keeping your knee bent and your foot flexed. Slowly lower your hips towards the ground, feeling a stretch in your quads. Hold this position for 20-30 seconds. Switch legs and repeat the stretch on the other side.', '从四肢着地开始，双手直接放在肩膀下方，膝盖直接放在臀部下方。 将一条腿向后伸直，保持膝盖弯曲和脚弯曲。 慢慢地将臀部降低到地面，感觉股四头肌的伸展。 保持这个姿势20-30秒。 换腿并在另一侧重复拉伸。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/1512-qBcKorM.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- alternate heel touchers [body weight]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'alternate heel touchers', NULL,
  'Core Training', '核心训练',
  'body weight', '自重',
  'abs', '腹肌',
  'Lie flat on your back with your knees bent and feet flat on the ground. Extend your arms straight out to the sides, parallel to the ground. Engaging your abs, lift your shoulders off the ground and reach your right hand towards your right heel. Return to the starting position and repeat on the left side, reaching your left hand towards your left heel. Continue alternating sides for the desired number of repetitions.', '平躺，膝盖弯曲，双脚平放在地上。 将双臂伸直至两侧，与地面平行。 收紧腹肌，将肩膀抬离地面，并将右手伸向右脚跟。 返回起始位置并在左侧重复，将左手伸向左脚跟。 继续交替进行所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0006-qaZVsGk.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- ankle circles [body weight]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'ankle circles', NULL,
  'Functional Training', '功能性训练',
  'body weight', '自重',
  'calves', '小腿肌',
  'Sit on the ground with your legs extended in front of you. Lift one leg off the ground and rotate your ankle in a circular motion. Perform the desired number of circles in one direction, then switch to the other direction. Repeat with the other leg.', '坐在地上，双腿在身前伸展。 将一条腿抬离地面，并以圆周运动旋转脚踝。 在一个方向上转所需的圈数，然后切换到另一个方向。 换另一条腿重复上述步骤。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/1368-uL9CsKm.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- archer pull up [body weight]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'archer pull up', NULL,
  'Strength Training', '力量训练',
  'body weight', '自重',
  'lats', '背阔肌',
  'Start by hanging from a pull-up bar with an overhand grip, slightly wider than shoulder-width apart. Engage your core and pull your shoulder blades down and back. As you pull yourself up, bend one arm and bring your elbow towards your side, while keeping the other arm straight. Continue pulling until your chin is above the bar and your bent arm is fully flexed. Lower yourself back down with control, straightening the bent arm and repeating the movement on the other side. Alternate sides with each repetition.', '首先，用正手握法悬挂在引体向上杆上，握距略宽于肩宽。 启动你的核心并将肩胛骨向下拉和向后拉。 当你站起来时，弯曲一只手臂并将肘部移向身体一侧，同时保持另一只手臂伸直。 继续拉，直到下巴位于杠铃上方并且弯曲的手臂完全弯曲。 有控制地放低自己，伸直弯曲的手臂并在另一侧重复该动作。 每次重复时交替进行。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/3293-72BC5Za.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- archer push up [body weight]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'archer push up', NULL,
  'Strength Training', '力量训练',
  'body weight', '自重',
  'pectorals', '胸肌',
  'Start in a push-up position with your hands slightly wider than shoulder-width apart. Extend one arm straight out to the side, parallel to the ground. Lower your body by bending your elbows, keeping your back straight and core engaged. Push back up to the starting position. Repeat on the other side, extending the opposite arm out to the side. Continue alternating sides for the desired number of repetitions.', '从俯卧撑位置开始，双手分开略宽于肩宽。 将一只手臂伸直至一侧，与地面平行。 弯曲肘部降低身体，保持背部挺直，核心参与。 推回到起始位置。 在另一侧重复上述步骤，将另一只手臂伸出到一侧。 继续交替进行所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/3294-A9qxk2F.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- arm slingers hanging bent knee legs [body weight]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'arm slingers hanging bent knee legs', NULL,
  'Core Training', '核心训练',
  'body weight', '自重',
  'abs', '腹肌',
  'Hang from a pull-up bar with your arms fully extended and your knees bent at a 90-degree angle. Engage your core and lift your knees towards your chest, bringing them as close to your elbows as possible. Slowly lower your legs back down to the starting position. Repeat for the desired number of repetitions.', '悬挂在引体向上杆上，双臂完全伸展，膝盖弯曲成 90 度角。 收紧核心并将膝盖抬向胸部，尽可能靠近肘部。 慢慢地将双腿放回起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/2355-uWpxD4v.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- arm slingers hanging straight legs [body weight]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'arm slingers hanging straight legs', NULL,
  'Core Training', '核心训练',
  'body weight', '自重',
  'abs', '腹肌',
  'Hang from a pull-up bar with your arms fully extended and your legs straight down. Engage your core and lift your legs up in front of you until they are parallel to the ground. Hold for a moment at the top, then slowly lower your legs back down to the starting position. Repeat for the desired number of repetitions.', '悬挂在引体向上杆上，双臂完全伸展，双腿伸直向下。 启动你的核心并将双腿抬起到你面前，直到它们与地面平行。 在顶部保持片刻，然后慢慢将双腿放回起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/2333-PXTIwgu.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- arms apart circular toe touch (male) [body weight]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'arms apart circular toe touch (male)', NULL,
  'Strength Training', '力量训练',
  'body weight', '自重',
  'glutes', '臀肌',
  'Stand with your feet shoulder-width apart and arms extended to the sides. Keeping your legs straight, bend forward at the waist and reach down towards your toes with your right hand. As you reach down, simultaneously lift your left leg straight up behind you, maintaining balance. Return to the starting position and repeat the movement with your left hand reaching towards your toes and your right leg lifting up behind you. Continue alternating sides for the desired number of repetitions.', '双脚分开与肩同宽站立，双臂向两侧伸展。 保持双腿伸直，腰部向前弯曲，右手向下伸向脚趾。 当你向下伸展时，同时将左腿在身后伸直，保持平衡。 返回起始位置，重复该动作，左手伸向脚趾，右腿在身后抬起。 继续交替进行所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/3214-RtyAsy1.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- dumbbell bench press [dumbbell]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'dumbbell bench press', NULL,
  'Strength Training', '力量训练',
  'dumbbell', '哑铃',
  'pectorals', '胸肌',
  'Lie flat on a bench with your feet flat on the ground and your back pressed against the bench. Hold a dumbbell in each hand, with your palms facing forward and your arms extended above your chest. Lower the dumbbells slowly to the sides of your chest, keeping your elbows at a 90-degree angle. Pause for a moment, then push the dumbbells back up to the starting position, fully extending your arms. Repeat for the desired number of repetitions.', '平躺在长凳上，双脚平放在地上，背部紧贴长凳。 双手各握一个哑铃，手掌朝前，双臂伸至胸部上方。 慢慢地将哑铃降低到胸部两侧，保持肘部呈 90 度角。 暂停片刻，然后将哑铃推回起始位置，完全伸展双臂。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0289-SpYC0Kp.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- dumbbell lateral raise [dumbbell]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'dumbbell lateral raise', NULL,
  'Resistance Training', '抗阻训练',
  'dumbbell', '哑铃',
  'delts', '三角肌',
  'Stand with your feet shoulder-width apart and hold a dumbbell in each hand, palms facing your body. Keep your back straight and engage your core. Raise your arms out to the sides until they are parallel to the floor, keeping a slight bend in your elbows. Pause for a moment at the top, then slowly lower your arms back down to the starting position. Repeat for the desired number of repetitions.', '双脚分开与肩同宽站立，双手各握一个哑铃，手掌朝向身体。 保持背部挺直并启动核心肌群。 将手臂向两侧抬起，直到与地板平行，保持肘部稍微弯曲。 在顶部暂停片刻，然后慢慢将手臂放回起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0334-DsgkuIt.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- dumbbell fly [dumbbell]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'dumbbell fly', NULL,
  'Strength Training', '力量训练',
  'dumbbell', '哑铃',
  'pectorals', '胸肌',
  'Lie flat on a bench with a dumbbell in each hand, palms facing each other. Extend your arms straight up over your chest, with a slight bend in your elbows. Keeping a slight bend in your elbows, lower your arms out to the sides in a wide arc until you feel a stretch in your chest. Pause for a moment, then reverse the movement and bring the dumbbells back up to the starting position. Repeat for the desired number of repetitions.', '平躺在长凳上，双手各握一个哑铃，手掌相对。 将手臂伸直越过胸部，肘部稍微弯曲。 保持肘部轻微弯曲，将手臂以宽弧线向两侧放低，直到感觉到胸部有拉伸感。 暂停片刻，然后反转动作，将哑铃拉回到起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0308-yz9nUhF.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- dumbbell deadlift [dumbbell]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'dumbbell deadlift', NULL,
  'Strength Training', '力量训练',
  'dumbbell', '哑铃',
  'glutes', '臀肌',
  'Stand with your feet shoulder-width apart, toes pointing forward. Hold a dumbbell in each hand, palms facing your body, arms extended downwards. Bend at your hips and knees, lowering the dumbbells towards the ground while keeping your back straight. Push through your heels and extend your hips and knees, lifting the dumbbells back up to the starting position. Repeat for the desired number of repetitions.', '双脚分开与肩同宽站立，脚趾指向前方。 双手各握一个哑铃，手掌朝向身体，手臂向下伸展。 弯曲臀部和膝盖，将哑铃向地面降低，同时保持背部挺直。 脚跟用力，伸展臀部和膝盖，将哑铃举回起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0300-nUwVh7b.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- dumbbell squat [dumbbell]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'dumbbell squat', NULL,
  'Strength Training', '力量训练',
  'dumbbell', '哑铃',
  'glutes', '臀肌',
  'Stand with your feet shoulder-width apart, holding a dumbbell in each hand at your sides. Keeping your chest up and core engaged, lower your body down by bending at the knees and hips, as if sitting back into a chair. Continue lowering until your thighs are parallel to the ground, or as low as you can comfortably go. Pause for a moment at the bottom, then push through your heels to return to the starting position. Repeat for the desired number of repetitions.', '双脚分开与肩同宽站立，双手各握一个哑铃放在身体两侧。 保持胸部挺直，核心收紧，弯曲膝盖和臀部，降低身体，就像坐回椅子上一样。 继续降低，直到大腿与地面平行，或者尽可能低。 在底部停顿片刻，然后推动脚后跟回到起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0413-HsvHqgf.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- dumbbell lunge [dumbbell]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'dumbbell lunge', NULL,
  'Strength Training', '力量训练',
  'dumbbell', '哑铃',
  'glutes', '臀肌',
  'Stand with your feet shoulder-width apart, holding a dumbbell in each hand. Take a step forward with your right foot, lowering your body into a lunge position. Keep your back straight and your chest up as you lower your body. Push through your right heel to return to the starting position. Repeat with your left leg. Alternate legs for the desired number of repetitions.', '双脚分开与肩同宽站立，每只手各握一个哑铃。 右脚向前迈出一步，将身体降低至弓步位置。 降低身体时保持背部挺直、挺胸。 推动右脚跟回到起始位置。 左腿重复上述动作。 交替腿进行所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0336-RRWFUcw.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- dumbbell step-up [dumbbell]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'dumbbell step-up', NULL,
  'Strength Training', '力量训练',
  'dumbbell', '哑铃',
  'glutes', '臀肌',
  'Stand in front of a bench or step with a dumbbell in each hand, palms facing your body. Place your right foot on the bench or step, ensuring your entire foot is in contact with the surface. Push through your right heel and lift your body up onto the bench or step, straightening your right leg. Bring your left foot up onto the bench or step, standing fully upright. Step back down with your left foot, followed by your right foot, returning to the starting position. Repeat for the desired number of repetitions, then switch legs.', '站在长凳或台阶前，每只手各握一个哑铃，手掌朝向身体。 将右脚放在长凳或台阶上，确保整个脚与表面接触。 推动右脚跟，将身体抬起到长凳或台阶上，伸直右腿。 将左脚放在长凳或台阶上，完全直立。 左脚向后退一步，然后是右脚，回到起始位置。 重复所需的重复次数，然后换腿。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0431-aXtJhlg.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- dumbbell pullover [dumbbell]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'dumbbell pullover', NULL,
  'Strength Training', '力量训练',
  'dumbbell', '哑铃',
  'pectorals', '胸肌',
  'Lie flat on a bench with your head at one end and your feet on the floor. Hold a dumbbell with both hands and extend your arms straight above your chest. Keeping a slight bend in your elbows, slowly lower the dumbbell behind your head until you feel a stretch in your chest and shoulders. Pause for a moment, then raise the dumbbell back to the starting position. Repeat for the desired number of repetitions.', '平躺在长凳上，头放在一端，双脚放在地板上。 双手握住哑铃，将手臂伸直至胸部上方。 保持肘部轻微弯曲，慢慢地将哑铃放到脑后，直到感觉胸部和肩膀有拉伸感。 暂停片刻，然后将哑铃举回到起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0375-9XjtHvS.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- dumbbell front raise [dumbbell]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'dumbbell front raise', NULL,
  'Resistance Training', '抗阻训练',
  'dumbbell', '哑铃',
  'delts', '三角肌',
  'Stand with your feet shoulder-width apart, holding a dumbbell in each hand with your palms facing your thighs. Keeping your arms straight, exhale and lift the dumbbells in front of you until they are at shoulder level. Pause for a moment at the top, then inhale and slowly lower the dumbbells back down to the starting position. Repeat for the desired number of repetitions.', '双脚分开与肩同宽站立，双手各握一个哑铃，手掌朝向大腿。 保持双臂伸直，呼气并将哑铃举至身前，直至与肩齐平。 在顶部停顿片刻，然后吸气，慢慢将哑铃放回起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0310-3eGE2JC.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- dumbbell shrug [dumbbell]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'dumbbell shrug', NULL,
  'Strength Training', '力量训练',
  'dumbbell', '哑铃',
  'traps', '斜方肌',
  'Stand with your feet shoulder-width apart and hold a dumbbell in each hand with your palms facing your body. Keep your arms straight and let the dumbbells hang by your sides. Raise your shoulders as high as possible, as if you are trying to touch your ears with your shoulders. Hold the contraction for a second, then slowly lower your shoulders back down to the starting position. Repeat for the desired number of repetitions.', '双脚分开与肩同宽站立，双手各握一个哑铃，手掌朝向身体。 保持手臂伸直，让哑铃垂在身体两侧。 尽可能高地抬高肩膀，就像试图用肩膀触碰耳朵一样。 保持收缩一秒钟，然后慢慢将肩膀放回起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0406-NJzBsGJ.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- dumbbell romanian deadlift [dumbbell]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'dumbbell romanian deadlift', NULL,
  'Strength Training', '力量训练',
  'dumbbell', '哑铃',
  'glutes', '臀肌',
  'Stand with your feet shoulder-width apart, holding a dumbbell in each hand with an overhand grip. Keeping your back straight and your core engaged, hinge at the hips and lower the dumbbells towards the ground, allowing your knees to bend slightly. Lower the dumbbells until you feel a stretch in your hamstrings, then push through your heels and engage your glutes to return to the starting position. Repeat for the desired number of repetitions.', '双脚分开与肩同宽站立，双手各握一个哑铃，正握。 保持背部挺直，核心收紧，以臀部为铰链，将哑铃向地面降低，让膝盖稍微弯曲。 降低哑铃，直到感觉到腿筋拉伸，然后推动脚后跟并收紧臀肌，回到起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/1459-rR0LJzx.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- deep push up [dumbbell]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'deep push up', NULL,
  'Strength Training', '力量训练',
  'dumbbell', '哑铃',
  'pectorals', '胸肌',
  'Start in a high plank position with your hands slightly wider than shoulder-width apart and your body in a straight line. Lower your chest towards the ground by bending your elbows, keeping them close to your body. Push through your palms to extend your arms and return to the starting position. Repeat for the desired number of repetitions.', '从高平板支撑位置开始，双手分开略宽于肩宽，身体呈一条直线。 弯曲肘部，使胸部靠近地面，使胸部靠近地面。 推动手掌以伸展手臂并返回到起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/1274-vptOQ4N.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- dumbbell alternate biceps curl [dumbbell]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'dumbbell alternate biceps curl', NULL,
  'Resistance Training', '抗阻训练',
  'dumbbell', '哑铃',
  'biceps', '肱二头肌',
  'Stand up straight with a dumbbell in each hand, palms facing forward and arms fully extended. Keeping your upper arms stationary, exhale and curl the weights while contracting your biceps. Continue to raise the dumbbells until your biceps are fully contracted and the dumbbells are at shoulder level. Hold the contracted position for a brief pause as you squeeze your biceps. Inhale and slowly begin to lower the dumbbells back to the starting position. Repeat for the desired number of repetitions, alternating arms.', '站直，双手各握一个哑铃，手掌朝前，双臂完全伸展。 保持上臂静止，呼气并弯举哑铃，同时收缩二头肌。 继续举起哑铃，直到二头肌完全收缩并且哑铃与肩部齐平。 挤压二头肌时，保持收缩位置短暂停顿。 吸气并慢慢开始将哑铃放回起始位置。 重复所需的重复次数，交替手臂。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0285-BU15nH4.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- dumbbell alternate biceps curl (with arm blaster) [dumbbell]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'dumbbell alternate biceps curl (with arm blaster)', NULL,
  'Resistance Training', '抗阻训练',
  'dumbbell', '哑铃',
  'biceps', '肱二头肌',
  'Stand up straight with your feet shoulder-width apart and hold a dumbbell in each hand, palms facing forward. Place the arm blaster on your upper arms, ensuring a secure fit. Keeping your upper arms stationary, exhale and curl one dumbbell up towards your shoulder while contracting your biceps. Continue to raise the dumbbell until your biceps are fully contracted and the dumbbell is at shoulder level. Hold the contracted position for a brief pause as you squeeze your biceps. Inhale and slowly lower the dumbbell back to the starting position. Repeat the movement with the opposite arm. Continue alternating arms for the desired number of repetitions.', '站直，双脚分开与肩同宽，双手各握一个哑铃，手掌朝前。 将手臂冲击波放在上臂上，确保牢固贴合。 保持上臂静止，呼气并将一只哑铃向上弯向肩膀，同时收缩二头肌。 继续举起哑铃，直到二头肌完全收缩并且哑铃与肩部齐平。 挤压二头肌时，保持收缩位置短暂停顿。 吸气，慢慢将哑铃放回起始位置。 用另一只手臂重复该动作。 继续交替手臂进行所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/2403-CfKsRbG.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- dumbbell alternate hammer preacher curl [dumbbell]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'dumbbell alternate hammer preacher curl', NULL,
  'Resistance Training', '抗阻训练',
  'dumbbell', '哑铃',
  'biceps', '肱二头肌',
  'Sit on a preacher bench with a dumbbell in each hand, palms facing your torso and arms fully extended. Keep your upper arms stationary and exhale as you curl the weights while contracting your biceps. Continue to raise the dumbbells until your biceps are fully contracted and the dumbbells are at shoulder level. Hold the contracted position for a brief pause as you squeeze your biceps. Inhale and slowly begin to lower the dumbbells back to the starting position. Repeat for the recommended amount of repetitions.', '坐在牧师凳上，双手各持一个哑铃，手掌面向躯干，双臂完全伸展。 保持上臂静止，在弯举哑铃时呼气，同时收缩二头肌。 继续举起哑铃，直到二头肌完全收缩并且哑铃与肩部齐平。 挤压二头肌时，保持收缩位置短暂停顿。 吸气并慢慢开始将哑铃放回起始位置。 重复建议的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/1646-fy7Tgy4.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- dumbbell alternate preacher curl [dumbbell]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'dumbbell alternate preacher curl', NULL,
  'Resistance Training', '抗阻训练',
  'dumbbell', '哑铃',
  'biceps', '肱二头肌',
  'Sit on a preacher bench with a dumbbell in each hand, palms facing up. Rest your upper arms on the pad of the preacher bench, allowing your arms to fully extend. Keeping your upper arms stationary, exhale and curl the dumbbell in your right hand as you contract your biceps. Continue to curl the dumbbell until your biceps are fully contracted and the dumbbell is at shoulder level. Pause for a moment, then inhale and slowly lower the dumbbell back to the starting position. Repeat the movement with your left arm. Continue alternating arms for the desired number of repetitions.', '坐在牧师凳上，每只手各握一个哑铃，手掌朝上。 将上臂放在牧师凳的垫子上，让手臂完全伸展。 保持上臂静止，呼气并弯曲右手的哑铃，同时收缩二头肌。 继续弯举哑铃，直到二头肌完全收缩并且哑铃与肩部齐平。 暂停片刻，然后吸气，慢慢将哑铃放回起始位置。 用左臂重复该动作。 继续交替手臂进行所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/1647-NlfIbzq.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- dumbbell alternate seated hammer curl [dumbbell]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'dumbbell alternate seated hammer curl', NULL,
  'Resistance Training', '抗阻训练',
  'dumbbell', '哑铃',
  'biceps', '肱二头肌',
  'Sit on a bench with a dumbbell in each hand, palms facing your torso and arms extended down. Keep your back straight and your elbows close to your torso. Exhale and curl the dumbbell in your right hand towards your shoulder, keeping your upper arm stationary. Continue to raise the dumbbell until your biceps are fully contracted and the dumbbell is at shoulder level. Pause for a brief moment, then inhale and slowly lower the dumbbell back to the starting position. Repeat the movement with your left arm. Continue alternating arms for the desired number of repetitions.', '坐在长凳上，双手各握一个哑铃，手掌朝向躯干，手臂向下伸展。 保持背部挺直，肘部靠近躯干。 呼气，将右手的哑铃向肩膀弯曲，保持上臂静止。 继续举起哑铃，直到二头肌完全收缩并且哑铃与肩部齐平。 暂停片刻，然后吸气，慢慢将哑铃放回起始位置。 用左臂重复该动作。 继续交替手臂进行所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/1648-6em2Dxj.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- dumbbell alternate side press [dumbbell]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'dumbbell alternate side press', NULL,
  'Resistance Training', '抗阻训练',
  'dumbbell', '哑铃',
  'delts', '三角肌',
  'Stand with your feet shoulder-width apart, holding a dumbbell in each hand at shoulder height. Press one dumbbell overhead while keeping the other dumbbell at shoulder height. Lower the pressed dumbbell back to shoulder height while pressing the other dumbbell overhead. Continue alternating sides for the desired number of repetitions.', '双脚分开与肩同宽站立，双手各握一个哑铃，与肩同高。 将一个哑铃推过头顶，同时将另一个哑铃保持在与肩同高的位置。 将按下的哑铃放回肩部高度，同时将另一个哑铃压过头顶。 继续交替进行所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0286-izMnLqz.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- dumbbell alternating bicep curl with leg raised on exercise ball [dumbbell]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'dumbbell alternating bicep curl with leg raised on exercise ball', NULL,
  'Resistance Training', '抗阻训练',
  'dumbbell', '哑铃',
  'biceps', '肱二头肌',
  'Stand with your feet shoulder-width apart and hold a dumbbell in each hand, palms facing forward. Place an exercise ball behind you and position one foot on top of it, keeping your balance. With your arms fully extended and elbows close to your sides, curl one dumbbell towards your shoulder while keeping your upper arm stationary. Lower the dumbbell back down to the starting position and repeat with the other arm. Continue alternating arms for the desired number of repetitions.', '双脚分开与肩同宽站立，双手各握一个哑铃，手掌朝前。 将健身球放在身后，并将一只脚放在上面，保持平衡。 双臂完全伸展，肘部靠近身体两侧，将一只哑铃向肩膀弯曲，同时保持上臂静止。 将哑铃放回起始位置，然后用另一只手臂重复该动作。 继续交替手臂进行所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/1649-Zwiw7XR.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- dumbbell alternating seated bicep curl on exercise ball [dumbbell]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'dumbbell alternating seated bicep curl on exercise ball', NULL,
  'Resistance Training', '抗阻训练',
  'dumbbell', '哑铃',
  'biceps', '肱二头肌',
  'Sit on an exercise ball with your feet flat on the ground and your back straight. Hold a dumbbell in each hand with your palms facing forward and your arms fully extended. Keeping your upper arms stationary, exhale and curl one dumbbell while rotating your forearm until your palm is facing your shoulder. Inhale and slowly lower the dumbbell back to the starting position. Repeat the curl with the other arm. Continue alternating curls for the desired number of repetitions.', '坐在健身球上，双脚平放在地上，背部挺直。 每只手握住一个哑铃，手掌朝前，双臂完全伸展。 保持上臂静止，呼气并弯举一只哑铃，同时旋转前臂，直到手掌面向肩膀。 吸气，慢慢将哑铃放回起始位置。 用另一只手臂重复弯举动作。 继续交替卷发达到所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/1650-J74XlNf.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- barbell bench press [barbell]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'barbell bench press', NULL,
  'Strength Training', '力量训练',
  'barbell', '杠铃',
  'pectorals', '胸肌',
  'Lie flat on a bench with your feet flat on the ground and your back pressed against the bench. Grasp the barbell with an overhand grip slightly wider than shoulder-width apart. Lift the barbell off the rack and hold it directly above your chest with your arms fully extended. Lower the barbell slowly towards your chest, keeping your elbows tucked in. Pause for a moment when the barbell touches your chest. Push the barbell back up to the starting position by extending your arms. Repeat for the desired number of repetitions.', '平躺在长凳上，双脚平放在地上，背部紧贴长凳。 正手握住杠铃，握距略宽于肩宽。 将杠铃从架子上提起，并将其直接放在胸部上方，双臂完全伸展。 将杠铃慢慢降低到胸部，保持肘部内收。 当杠铃触及胸部时暂停片刻。 伸展双臂，将杠铃推回到起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0025-EIeI8Vf.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- barbell deadlift [barbell]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'barbell deadlift', NULL,
  'Strength Training', '力量训练',
  'barbell', '杠铃',
  'glutes', '臀肌',
  'Stand with your feet shoulder-width apart and the barbell on the ground in front of you. Bend your knees and hinge at the hips to lower your torso and grip the barbell with an overhand grip, hands slightly wider than shoulder-width apart. Keep your back straight and chest lifted as you drive through your heels to lift the barbell off the ground, extending your hips and knees. As you stand up straight, squeeze your glutes and keep your core engaged. Lower the barbell back down to the ground by bending at the hips and knees, keeping your back straight. Repeat for the desired number of repetitions.', '双脚分开与肩同宽站立，杠铃放在你面前的地面上。 弯曲膝盖并以臀部为铰链，降低躯干，正手握住杠铃，双手分开略宽于肩宽。 当你通过脚后跟将杠铃抬离地面时，保持背部挺直，胸部抬起，伸展臀部和膝盖。 当你站直时，挤压你的臀部并保持你的核心参与。 弯曲臀部和膝盖，将杠铃放回地面，保持背部挺直。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0032-ila4NZS.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- barbell bent over row [barbell]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'barbell bent over row', NULL,
  'Strength Training', '力量训练',
  'barbell', '杠铃',
  'upper back', '上背部',
  'Stand with your feet shoulder-width apart and knees slightly bent. Bend forward at the hips while keeping your back straight and chest up. Grasp the barbell with an overhand grip, hands slightly wider than shoulder-width apart. Pull the barbell towards your lower chest by retracting your shoulder blades and squeezing your back muscles. Pause for a moment at the top, then slowly lower the barbell back to the starting position. Repeat for the desired number of repetitions.', '站立，双脚分开与肩同宽，膝盖稍微弯曲。 臀部向前弯曲，同时保持背部挺直、挺胸。 正手握住杠铃，双手间距略宽于肩宽。 通过收缩肩胛骨并挤压背部肌肉，将杠铃拉向下胸部。 在顶部停顿片刻，然后慢慢将杠铃放回起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0027-eZyBC3j.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- barbell curl [barbell]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'barbell curl', NULL,
  'Resistance Training', '抗阻训练',
  'barbell', '杠铃',
  'biceps', '肱二头肌',
  'Stand up straight with your feet shoulder-width apart and hold a barbell with an underhand grip, palms facing forward. Keep your elbows close to your torso and exhale as you curl the weights while contracting your biceps. Continue to raise the bar until your biceps are fully contracted and the bar is at shoulder level. Hold the contracted position for a brief pause as you squeeze your biceps. Inhale as you slowly begin to lower the bar back to the starting position. Repeat for the desired number of repetitions.', '站直，双脚分开与肩同宽，反手握住杠铃，手掌朝前。 保持肘部靠近躯干，在弯举哑铃时呼气，同时收缩二头肌。 继续抬高杠铃，直到二头肌完全收缩并且杠铃与肩部齐平。 挤压二头肌时，保持收缩位置短暂停顿。 吸气，慢慢开始将杠铃放回起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0031-25GPyDY.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- barbell front squat [barbell]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'barbell front squat', NULL,
  'Strength Training', '力量训练',
  'barbell', '杠铃',
  'glutes', '臀肌',
  'Start by standing with your feet shoulder-width apart, toes slightly turned out. Hold the barbell in front of your shoulders, resting it on your collarbone and shoulders. Engage your core and keep your chest up as you lower your body down into a squat position, pushing your hips back and bending your knees. Lower until your thighs are parallel to the ground, or as low as you can comfortably go. Pause for a moment at the bottom, then push through your heels to return to the starting position. Repeat for the desired number of repetitions.', '首先站立，双脚分开与肩同宽，脚趾稍微向外。 将杠铃放在肩膀前面，将其放在锁骨和肩膀上。 当你将身体降低到蹲姿时，收紧核心并保持挺胸，将臀部向后推并弯曲膝盖。 降低直到大腿与地面平行，或者尽可能降低到您能舒服的高度。 在底部停顿片刻，然后推动脚后跟回到起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0042-zG0zs85.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- barbell lunge [barbell]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'barbell lunge', NULL,
  'Strength Training', '力量训练',
  'barbell', '杠铃',
  'glutes', '臀肌',
  'Start by standing with your feet shoulder-width apart and a barbell resting on your upper back. Take a step forward with your right foot, keeping your torso upright. Lower your body by bending your right knee until your thigh is parallel to the ground. Push through your right heel to return to the starting position. Repeat with your left leg, alternating legs for the desired number of repetitions.', '首先，双脚分开与肩同宽，将杠铃放在上背部。 右脚向前迈出一步，保持躯干直立。 弯曲右膝降低身体，直到大腿与地面平行。 推动右脚跟回到起始位置。 用左腿重复上述动作，交替腿进行所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0054-t8iSghb.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- barbell romanian deadlift [barbell]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'barbell romanian deadlift', NULL,
  'Strength Training', '力量训练',
  'barbell', '杠铃',
  'glutes', '臀肌',
  'Stand with your feet shoulder-width apart and your toes pointing forward. Hold the barbell with an overhand grip, hands slightly wider than shoulder-width apart. Bend at the hips, keeping your back straight and your knees slightly bent. Lower the barbell towards the ground, keeping it close to your body. Feel the stretch in your hamstrings as you lower the barbell. Once you feel a stretch in your hamstrings, push your hips forward and stand up straight. Squeeze your glutes at the top of the movement. Lower the barbell back down to the starting position and repeat for the desired number of repetitions.', '站立，双脚分开与肩同宽，脚趾指向前方。 正手握住杠铃，双手分开略宽于肩宽。 弯曲臀部，保持背部挺直，膝盖稍微弯曲。 将杠铃向地面降低，使其靠近身体。 当你降低杠铃时，感受腿筋的拉伸。 一旦感觉到腿筋拉伸，就将臀部向前推并站直。 在动作的最高点挤压臀部。 将杠铃放回起始位置，然后重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0085-wQ2c4XD.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- barbell shrug [barbell]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'barbell shrug', NULL,
  'Strength Training', '力量训练',
  'barbell', '杠铃',
  'traps', '斜方肌',
  'Stand with your feet shoulder-width apart and hold a barbell in front of you with an overhand grip. Keep your arms straight and your back straight throughout the exercise. Lift your shoulders up towards your ears as high as possible, squeezing your traps at the top. Hold for a moment, then slowly lower your shoulders back down to the starting position. Repeat for the desired number of repetitions.', '双脚分开与肩同宽站立，正手握住杠铃。 在整个练习过程中保持手臂伸直和背部挺直。 将肩膀尽可能高地抬向耳朵，挤压斜方肌顶部。 保持一会儿，然后慢慢将肩膀放回起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0095-dG7tG5y.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- barbell good morning [barbell]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'barbell good morning', NULL,
  'Strength Training', '力量训练',
  'barbell', '杠铃',
  'hamstrings', '腘绳肌',
  'Start by standing with your feet shoulder-width apart and the barbell resting on your upper back. Keeping your back straight and your core engaged, hinge forward at the hips, pushing your buttocks back as if you were trying to touch the wall behind you with your glutes. Lower your torso until it is parallel to the ground, feeling a stretch in your hamstrings. Pause for a moment, then return to the starting position by squeezing your glutes and pushing your hips forward. Repeat for the desired number of repetitions.', '首先站立，双脚分开与肩同宽，将杠铃放在上背部。 保持背部挺直，核心肌群参与，臀部向前转动，将臀部向后推，就好像你试图用臀部触碰身后的墙壁一样。 降低躯干直到与地面平行，感觉腿筋被拉伸。 暂停片刻，然后通过挤压臀部并将臀部向前推回到起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0044-XlZ4lAC.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- barbell incline bench press [barbell]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'barbell incline bench press', NULL,
  'Strength Training', '力量训练',
  'barbell', '杠铃',
  'pectorals', '胸肌',
  'Set up an incline bench at a 45-degree angle. Lie down on the bench with your feet flat on the ground. Grasp the barbell with an overhand grip, slightly wider than shoulder-width apart. Unrack the barbell and lower it slowly towards your chest, keeping your elbows at a 45-degree angle. Pause for a moment at the bottom, then push the barbell back up to the starting position. Repeat for the desired number of repetitions.', '设置一个 45 度角的上斜凳。 躺在长凳上，双脚平放在地上。 正手握住杠铃，握距略宽于肩宽。 松开杠铃并将其缓慢降低至胸部，保持肘部呈 45 度角。 在底部停顿片刻，然后将杠铃推回到起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0047-3TZduzM.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- barbell upright row [barbell]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'barbell upright row', NULL,
  'Resistance Training', '抗阻训练',
  'barbell', '杠铃',
  'delts', '三角肌',
  'Stand with your feet shoulder-width apart and hold a barbell with an overhand grip, hands slightly wider than shoulder-width apart. Let the barbell hang in front of your thighs, arms fully extended. Keeping your back straight and core engaged, exhale and lift the barbell straight up towards your chin, leading with your elbows. Pause for a moment at the top, then inhale and slowly lower the barbell back down to the starting position. Repeat for the desired number of repetitions.', '双脚分开与肩同宽站立，正手握住杠铃，双手分开略宽于肩宽。 让杠铃悬挂在大腿前面，双臂完全伸展。 保持背部挺直，核心收紧，呼气，将杠铃笔直向上举向下巴，用肘部引导。 在顶部停顿片刻，然后吸气，慢慢将杠铃放回起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0120-UDlhcO8.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- barbell full squat [barbell]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'barbell full squat', NULL,
  'Strength Training', '力量训练',
  'barbell', '杠铃',
  'glutes', '臀肌',
  'Stand with your feet shoulder-width apart, toes slightly turned out. Hold the barbell across your upper back, resting it on your traps or rear delts. Engage your core and keep your chest up as you begin to lower your body down. Bend at the knees and hips, pushing your hips back and down as if sitting into a chair. Lower yourself until your thighs are parallel to the ground or slightly below. Keep your knees in line with your toes and your weight in your heels. Drive through your heels to stand back up, extending your hips and knees. Repeat for the desired number of repetitions.', '站立，双脚分开与肩同宽，脚趾稍微向外。 将杠铃放在上背部，将其放在斜方肌或三角肌后束上。 当你开始降低身体时，启动你的核心并保持胸部挺直。 弯曲膝盖和臀部，向后和向下推臀部，就像坐在椅子上一样。 放低身体，直到大腿与地面平行或稍低于地面。 保持膝盖与脚趾对齐，并将重量放在脚后跟上。 通过脚后跟站起来，伸展臀部和膝盖。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0043-qXTaZnJ.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- barbell sumo deadlift [barbell]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'barbell sumo deadlift', NULL,
  'Strength Training', '力量训练',
  'barbell', '杠铃',
  'glutes', '臀肌',
  'Stand with your feet wider than shoulder-width apart, toes pointing outwards. Place a barbell on the ground in front of you, centered between your feet. Bend your knees and lower your hips, keeping your back straight and chest up, to grip the barbell with an overhand grip. Engage your core and drive through your heels to lift the barbell off the ground, extending your hips and knees simultaneously. As you lift, keep your chest up and back straight, and push your hips forward to fully engage your glutes. Pause for a moment at the top, then slowly lower the barbell back down to the starting position, maintaining control throughout the movement. Repeat for the desired number of repetitions.', '站立，双脚分开比肩宽，脚趾朝外。 将杠铃放在您面前的地面上，位于双脚之间的中心。 弯曲膝盖，降低臀部，保持背部挺直，挺胸，用正手握法抓住杠铃。 启动你的核心并通过你的脚后跟发力，将杠铃抬离地面，同时伸展你的臀部和膝盖。 当你举起时，保持胸部挺直，背部挺直，向前推动臀部以充分锻炼臀部。 在顶部停顿片刻，然后慢慢将杠铃放回起始位置，在整个动作过程中保持控制。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0117-KgI0tqW.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- barbell step-up [barbell]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'barbell step-up', NULL,
  'Strength Training', '力量训练',
  'barbell', '杠铃',
  'glutes', '臀肌',
  'Stand in front of a bench or step with a barbell resting on your upper back. Place one foot on the bench or step, ensuring your entire foot is in contact with the surface. Push through your heel and step up onto the bench or step, fully extending your hip and knee. Pause briefly at the top, then lower yourself back down to the starting position. Repeat with the opposite leg. Continue alternating legs for the desired number of repetitions.', '站在长凳或台阶前，将杠铃放在上背部。 将一只脚放在长凳或台阶上，确保整个脚与表面接触。 穿过你的脚后跟，走上长凳或台阶，充分伸展你的臀部和膝盖。 在顶部短暂停顿，然后放低自己回到起始位置。 用另一条腿重复上述步骤。 继续交替双腿达到所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0114-Kxquu2E.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- barbell alternate biceps curl [barbell]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'barbell alternate biceps curl', NULL,
  'Resistance Training', '抗阻训练',
  'barbell', '杠铃',
  'biceps', '肱二头肌',
  'Stand up straight with your feet shoulder-width apart and hold a barbell in each hand, palms facing forward. Keep your upper arms stationary and exhale as you curl the weights while contracting your biceps. Continue to raise the barbells until your biceps are fully contracted and the barbells are at shoulder level. Hold the contracted position for a brief pause as you squeeze your biceps. Inhale as you slowly begin to lower the barbells back to the starting position. Repeat for the desired number of repetitions, alternating arms.', '站直，双脚分开与肩同宽，每只手握住一个杠铃，手掌朝前。 保持上臂静止，在弯举哑铃时呼气，同时收缩二头肌。 继续举起杠铃，直到二头肌完全收缩并且杠铃与肩部齐平。 挤压二头肌时，保持收缩位置短暂停顿。 吸气，慢慢开始将杠铃放回起始位置。 重复所需的重复次数，交替手臂。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0023-Yza7XrQ.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- barbell bench front squat [barbell]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'barbell bench front squat', NULL,
  'Strength Training', '力量训练',
  'barbell', '杠铃',
  'quads', '股四头肌',
  'Start by standing with your feet shoulder-width apart and the barbell resting on your upper chest, just below your collarbone. Hold the barbell with an overhand grip, keeping your elbows up and your upper arms parallel to the ground. Lower your body down into a squat position by bending at the knees and hips, keeping your back straight and your chest up. Pause for a moment at the bottom of the squat, then push through your heels to return to the starting position. Repeat for the desired number of repetitions.', '首先站立，双脚分开与肩同宽，将杠铃放在上胸部，锁骨下方。 正手握住杠铃，保持肘部向上，上臂与地面平行。 弯曲膝盖和臀部，将身体降低到蹲姿，保持背部挺直，挺胸。 在深蹲底部暂停片刻，然后用脚后跟恢复到起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0024-Y7YcmIJ.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- barbell bench squat [barbell]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'barbell bench squat', NULL,
  'Strength Training', '力量训练',
  'barbell', '杠铃',
  'quads', '股四头肌',
  'Set up a barbell on a squat rack at chest height. Stand facing away from the rack, with your feet shoulder-width apart. Bend your knees and lower your body down into a squat position, keeping your back straight and chest up. Grasp the barbell with an overhand grip, slightly wider than shoulder-width apart. Lift the barbell off the rack and step back, ensuring your feet are still shoulder-width apart. Lower your body down into a squat, keeping your knees in line with your toes. Pause for a moment at the bottom, then push through your heels to return to the starting position. Repeat for the desired number of repetitions.', '将杠铃放在深蹲架上，与胸部同高。 背对架子站立，双脚与肩同宽。 弯曲膝盖，将身体降低至蹲姿，保持背部挺直，挺胸。 正手握住杠铃，握距略宽于肩宽。 将杠铃从架子上提起并向后退一步，确保双脚仍与肩同宽。 降低身体蹲下，保持膝盖与脚趾在一条线上。 在底部停顿片刻，然后推动脚后跟回到起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0026-W9pFVv1.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- barbell bent arm pullover [barbell]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'barbell bent arm pullover', NULL,
  'Strength Training', '力量训练',
  'barbell', '杠铃',
  'lats', '背阔肌',
  'Lie flat on a bench with your head at one end and your feet on the floor. Hold a barbell with a shoulder-width grip and extend your arms straight above your chest. Lower the barbell behind your head while keeping your arms slightly bent. Pause for a moment, then raise the barbell back to the starting position. Repeat for the desired number of repetitions.', '平躺在长凳上，头放在一端，双脚放在地板上。 握距与肩同宽，握住杠铃，将手臂伸直至胸部上方。 将杠铃放在脑后，同时保持手臂稍微弯曲。 暂停片刻，然后将杠铃举回起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/1316-cA9FuWG.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- barbell biceps curl (with arm blaster) [barbell]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'barbell biceps curl (with arm blaster)', NULL,
  'Resistance Training', '抗阻训练',
  'barbell', '杠铃',
  'biceps', '肱二头肌',
  'Stand up straight with your feet shoulder-width apart and hold a barbell with an underhand grip, palms facing up. Place your upper arms against the arm blaster, keeping your elbows close to your torso. Keeping your upper arms stationary, exhale and curl the weights while contracting your biceps. Continue to raise the barbell until your biceps are fully contracted and the bar is at shoulder level. Hold the contracted position for a brief pause as you squeeze your biceps. Inhale and slowly begin to lower the barbell back to the starting position. Repeat for the desired number of repetitions.', '站直，双脚分开与肩同宽，反手握住杠铃，手掌朝上。 将上臂靠在手臂冲击波上，保持肘部靠近躯干。 保持上臂静止，呼气并弯举哑铃，同时收缩二头肌。 继续举起杠铃，直到二头肌完全收缩并且杠铃与肩部齐平。 挤压二头肌时，保持收缩位置短暂停顿。 吸气并慢慢开始将杠铃放回起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/2407-aee2Fcj.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- barbell clean and press [barbell]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'barbell clean and press', NULL,
  'Strength Training', '力量训练',
  'barbell', '杠铃',
  'quads', '股四头肌',
  'Stand with your feet shoulder-width apart and the barbell on the floor in front of you. Bend your knees and hinge at the hips to lower down and grip the barbell with an overhand grip, hands slightly wider than shoulder-width apart. Drive through your heels and extend your hips and knees to lift the barbell off the floor, keeping it close to your body. As the barbell reaches your thighs, explosively extend your hips, shrug your shoulders, and pull the barbell up towards your chest. As the barbell reaches chest height, quickly drop under it and catch it at shoulder level, with your elbows pointing forward and your palms facing up. From the catch position, press the barbell overhead by extending your arms and pushing the barbell straight up. Lower the barbell back down to the starting position and repeat for the desired number of repetitions.', '双脚分开与肩同宽站立，杠铃放在你面前的地板上。 弯曲膝盖并以臀部为铰链降低并用正手握住杠铃，双手分开略宽于肩宽。 通过脚后跟发力，伸展臀部和膝盖，将杠铃抬离地板，使其靠近身体。 当杠铃到达大腿时，爆发性伸展臀部，耸肩，并将杠铃拉向胸部。 当杠铃到达胸部高度时，迅速将其降至肩部水平，肘部向前，手掌朝上。 从接球位置开始，伸展双臂并将杠铃笔直向上推，将杠铃压过头顶。 将杠铃放回起始位置，然后重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0028-SGY8Zui.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- cable curl [cable]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'cable curl', NULL,
  'Resistance Training', '抗阻训练',
  'cable', '绳索',
  'biceps', '肱二头肌',
  'Stand facing the cable machine with your feet shoulder-width apart. Grasp the cable attachment with an underhand grip, palms facing up. Keep your elbows close to your sides and your upper arms stationary. Exhale and curl the cable attachment towards your shoulders, contracting your biceps. Pause for a moment at the top of the movement, squeezing your biceps. Inhale and slowly lower the cable attachment back to the starting position. Repeat for the desired number of repetitions.', '面对电缆机站立，双脚与肩同宽。 用手握住电缆附件，手掌朝上。 保持肘部靠近身体两侧，上臂保持静止。 呼气并将电缆附件卷向肩膀，收缩二头肌。 在动作的最高点暂停片刻，挤压你的二头肌。 吸气并缓慢地将电缆附件放回起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0868-G08RZcQ.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- cable lateral raise [cable]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'cable lateral raise', NULL,
  'Resistance Training', '抗阻训练',
  'cable', '绳索',
  'delts', '三角肌',
  'Stand with your feet shoulder-width apart and grasp the cable handles with an overhand grip. Keep your arms straight and your core engaged. Raise your arms out to the sides until they are parallel to the floor. Pause for a moment at the top, then slowly lower your arms back down to the starting position. Repeat for the desired number of repetitions.', '双脚分开与肩同宽站立，并用正手握住电缆手柄。 保持双臂伸直，核心肌群参与。 将手臂向两侧举起，直到与地板平行。 在顶部暂停片刻，然后慢慢将手臂放回起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0178-goJ6ezq.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- cable kickback [cable]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'cable kickback', NULL,
  'Resistance Training', '抗阻训练',
  'cable', '绳索',
  'triceps', '肱三头肌',
  'Stand facing a cable machine with your feet shoulder-width apart. Hold the cable handle with your right hand and step back to create tension in the cable. Bend your knees slightly and hinge forward at the hips, keeping your back straight. Keep your upper arm close to your body and your elbow bent at a 90-degree angle. Extend your forearm backward, straightening your arm fully. Pause for a moment, then slowly return to the starting position. Repeat for the desired number of repetitions, then switch sides.', '面向缆绳机站立，双脚与肩同宽。 用右手握住电缆手柄并后退以在电缆中产生张力。 稍微弯曲膝盖，髋部向前转动，保持背部挺直。 保持上臂靠近身体，肘部弯曲成 90 度角。 向后伸展前臂，完全伸直手臂。 暂停片刻，然后慢慢回到起始位置。 重复所需的重复次数，然后换边。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0860-HEJ6DIX.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- cable upright row [cable]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'cable upright row', NULL,
  'Resistance Training', '抗阻训练',
  'cable', '绳索',
  'delts', '三角肌',
  'Stand with your feet shoulder-width apart, knees slightly bent, and hold the cable attachment with an overhand grip. Keep your back straight and your core engaged throughout the exercise. Pull the cable attachment straight up towards your chin, leading with your elbows. Pause for a moment at the top, squeezing your shoulder blades together. Slowly lower the cable attachment back down to the starting position. Repeat for the desired number of repetitions.', '双脚分开与肩同宽站立，膝盖稍微弯曲，并用正手握住电缆附件。 在整个练习过程中保持背部挺直，核心肌群参与其中。 用肘部引导，将电缆附件笔直向上拉向下巴。 在顶部暂停片刻，将肩胛骨挤压在一起。 缓慢地将电缆附件放回起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0246-cALKspW.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- alternate lateral pulldown [cable]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'alternate lateral pulldown', NULL,
  'Strength Training', '力量训练',
  'cable', '绳索',
  'lats', '背阔肌',
  'Sit on the cable machine with your back straight and feet flat on the ground. Grasp the handles with an overhand grip, slightly wider than shoulder-width apart. Lean back slightly and pull the handles towards your chest, squeezing your shoulder blades together. Pause for a moment at the peak of the movement, then slowly release the handles back to the starting position. Repeat for the desired number of repetitions.', '坐在缆绳机上，背部挺直，双脚平放在地面上。 正手握住手柄，握距略宽于肩宽。 稍微向后倾斜，将手柄拉向胸部，将肩胛骨挤压在一起。 在动作的最高点暂停片刻，然后慢慢松开手柄回到起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0007-4IKbhHV.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- cable alternate shoulder press [cable]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'cable alternate shoulder press', NULL,
  'Resistance Training', '抗阻训练',
  'cable', '绳索',
  'delts', '三角肌',
  'Stand with your feet shoulder-width apart and grasp the handles of the cable machine with an overhand grip. Position your hands at shoulder height, with your palms facing forward. Keep your core engaged and your back straight. Press one handle up and forward until your arm is fully extended. Pause for a moment at the top, then slowly lower the handle back to the starting position. Repeat with the other arm. Alternate between arms for the desired number of repetitions.', '双脚分开与肩同宽站立，并用正手握住绳索机的手柄。 将双手放在与肩同高的位置，手掌朝前。 保持核心参与并保持背部挺直。 向上并向前按下一个手柄，直到您的手臂完全伸展。 在最高点暂停片刻，然后慢慢将手柄放回起始位置。 用另一只手臂重复上述步骤。 双臂交替进行所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0148-KHPZL0b.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- cable alternate triceps extension [cable]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'cable alternate triceps extension', NULL,
  'Resistance Training', '抗阻训练',
  'cable', '绳索',
  'triceps', '肱三头肌',
  'Stand facing the cable machine with your feet shoulder-width apart. Hold the cable handle with your right hand and bring your arm up so that your upper arm is parallel to the ground and your elbow is bent at a 90-degree angle. Keep your upper arm stationary and extend your forearm backward, fully straightening your arm. Pause for a moment, then slowly return to the starting position. Repeat with your left arm. Continue alternating arms for the desired number of repetitions.', '面对电缆机站立，双脚与肩同宽。 右手握住电缆手柄，抬起手臂，使上臂与地面平行，肘部弯曲成 90 度角。 保持上臂静止，前臂向后伸展，完全伸直手臂。 暂停片刻，然后慢慢回到起始位置。 用左臂重复此动作。 继续交替手臂进行所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0149-Gchi5Tr.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- cable assisted inverse leg curl [cable]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'cable assisted inverse leg curl', NULL,
  'Strength Training', '力量训练',
  'cable', '绳索',
  'hamstrings', '腘绳肌',
  'Adjust the cable machine so that the ankle attachment is at the lowest setting. Lie face down on the bench with your legs straight and the ankle attachment secured to your ankles. Hold onto the handles of the bench for stability. Keeping your upper body stationary, exhale and curl your legs up towards your glutes by flexing your knees. Pause for a moment at the top of the movement, squeezing your hamstrings. Inhale and slowly lower your legs back to the starting position. Repeat for the desired number of repetitions.', '调整缆绳机，使脚踝附件处于最低设置。 面朝下躺在长凳上，双腿伸直，将脚踝固定装置固定在脚踝上。 握住长凳的把手以保持稳定。 保持上半身静止，呼气，弯曲膝盖，将双腿向臀肌方向卷起。 在动作的最高点暂停片刻，挤压你的腿筋。 吸气并慢慢降低双腿回到起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/3235-zHEpuuc.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- cable bar lateral pulldown [cable]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'cable bar lateral pulldown', NULL,
  'Strength Training', '力量训练',
  'cable', '绳索',
  'lats', '背阔肌',
  'Adjust the cable pulley to a high position and attach a straight bar. Sit facing the cable machine with your feet flat on the ground and your knees slightly bent. Grasp the bar with an overhand grip, slightly wider than shoulder-width apart. Lean back slightly and keep your chest up, maintaining a slight arch in your lower back. Pull the bar down towards your chest, leading with your elbows and squeezing your shoulder blades together. Pause for a moment at the bottom of the movement, then slowly return the bar to the starting position. Repeat for the desired number of repetitions.', '将电缆滑轮调整至较高位置并安装直杆。 面向缆绳机坐着，双脚平放在地面上，膝盖稍微弯曲。 正手握住杠铃，握距略宽于肩宽。 稍微向后倾斜，挺胸，保持下背部轻微的拱形。 将杠铃向下拉向胸部，用肘部引导并将肩胛骨挤压在一起。 在动作底部暂停片刻，然后慢慢地将杠铃返回到起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0150-eYnzaCm.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- cable bench press [cable]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'cable bench press', NULL,
  'Strength Training', '力量训练',
  'cable', '绳索',
  'pectorals', '胸肌',
  'Adjust the cable machine to chest height and attach the handles. Stand facing away from the machine with your feet shoulder-width apart. Grasp the handles with an overhand grip and step forward to create tension in the cables. Position your feet firmly on the ground and engage your core. Bend your elbows and bring your hands to shoulder level, keeping your elbows at a 90-degree angle. Push the handles forward, extending your arms fully in front of you. Pause for a moment, then slowly reverse the movement, bringing your hands back to shoulder level. Repeat for the desired number of repetitions.', '将绳索机调整至胸部高度并安装手柄。 背对机器站立，双脚与肩同宽。 正手握住手柄并向前迈一步，以在电缆中产生张力。 将双脚牢牢放在地面上并启动核心。 弯曲肘部，将双手置于肩部水平，保持肘部呈 90 度角。 向前推动手柄，将双臂完全伸展到身前。 暂停片刻，然后慢慢扭转动作，将双手放回肩部水平。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0151-7xI5MXA.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- cable close grip curl [cable]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'cable close grip curl', NULL,
  'Resistance Training', '抗阻训练',
  'cable', '绳索',
  'biceps', '肱二头肌',
  'Attach a straight bar to a low pulley cable machine. Stand facing the machine with your feet shoulder-width apart and your knees slightly bent. Grasp the bar with an underhand grip, hands shoulder-width apart. Keep your elbows close to your sides and your upper arms stationary throughout the exercise. Exhale and curl the bar up towards your shoulders, contracting your biceps. Pause for a moment at the top of the movement, squeezing your biceps. Inhale and slowly lower the bar back to the starting position, fully extending your arms. Repeat for the desired number of repetitions.', '将直杆连接到低滑轮电缆机上。 面向机器站立，双脚分开与肩同宽，膝盖稍微弯曲。 反手握住杠铃，双手与肩同宽。 在整个练习过程中，保持肘部靠近身体两侧，上臂保持静止。 呼气并将杠铃向上卷向肩膀，收缩二头肌。 在动作的最高点暂停片刻，挤压你的二头肌。 吸气，慢慢将杠铃放回起始位置，充分伸展双臂。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/1630-BCGQ6J5.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- cable concentration curl [cable]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'cable concentration curl', NULL,
  'Resistance Training', '抗阻训练',
  'cable', '绳索',
  'biceps', '肱二头肌',
  'Sit on a bench or chair with your feet flat on the floor and your knees slightly bent. Hold the cable handle with an underhand grip and rest your elbow against the inside of your thigh. Keeping your upper arm stationary, exhale and curl the cable handle towards your shoulder while contracting your biceps. Pause for a moment at the top of the movement, then inhale and slowly lower the cable handle back to the starting position. Repeat for the desired number of repetitions, then switch arms.', '坐在长凳或椅子上，双脚平放在地板上，膝盖稍微弯曲。 用手握住电缆手柄，并将肘部靠在大腿内侧。 保持上臂静止，呼气并将电缆手柄向肩膀卷曲，同时收缩二头肌。 在动作的最高点暂停片刻，然后吸气并慢慢将拉索手柄放回起始位置。 重复所需的重复次数，然后换臂。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/1631-NvfE43H.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- cable concentration extension (on knee) [cable]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'cable concentration extension (on knee)', NULL,
  'Resistance Training', '抗阻训练',
  'cable', '绳索',
  'triceps', '肱三头肌',
  'Sit on a bench or chair with your knees bent and feet flat on the ground. Hold the cable handle with your right hand and place your elbow on the inside of your right knee. Extend your arm fully, keeping your elbow stationary and close to your knee. Pause for a moment at the top, then slowly lower your arm back to the starting position. Repeat for the desired number of repetitions, then switch sides.', '坐在长凳或椅子上，膝盖弯曲，双脚平放在地上。 用右手握住电缆手柄，并将肘部放在右膝盖内侧。 充分伸展手臂，保持肘部静止并靠近膝盖。 在顶部停顿片刻，然后慢慢将手臂放回起始位置。 重复所需的重复次数，然后换边。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0152-Db7eEgw.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- cable cross-over lateral pulldown [cable]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'cable cross-over lateral pulldown', NULL,
  'Strength Training', '力量训练',
  'cable', '绳索',
  'lats', '背阔肌',
  'Attach a cable handle to each side of a cable machine at shoulder height. Stand in the middle of the machine with your feet shoulder-width apart. Grasp the handles with an overhand grip and step back to create tension in the cables. Lean forward slightly from the hips, keeping your back straight and your chest up. Pull the handles down and across your body, squeezing your shoulder blades together. Pause for a moment at the bottom of the movement, then slowly return to the starting position. Repeat for the desired number of repetitions.', '将电缆手柄连接到电缆机器两侧与肩同高的位置。 站在机器中间，双脚分开与肩同宽。 正手握住手柄并后退以在电缆中产生张力。 从臀部开始稍微向前倾，保持背部挺直，挺胸。 将手柄向下拉并穿过身体，将肩胛骨挤压在一起。 在动作底部暂停片刻，然后慢慢回到起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0153-OQ1otBN.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- cable cross-over revers fly [cable]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'cable cross-over revers fly', NULL,
  'Resistance Training', '抗阻训练',
  'cable', '绳索',
  'delts', '三角肌',
  'Attach a D-handle to each low pulley cable and stand in the middle of the cable crossover machine. Grasp the handles with a pronated grip (palms facing down) and take a step forward, positioning your feet shoulder-width apart. Bend your knees slightly and lean forward at the waist, keeping your back straight and your abs engaged. With your arms extended out to the sides and slightly bent at the elbows, exhale and squeeze your shoulder blades together as you pull the cables back and upward in a reverse fly motion. Pause for a moment at the peak contraction, then inhale and slowly return to the starting position. Repeat for the desired number of repetitions.', '将 D 形手柄连接到每根低滑轮电缆上，并站在电缆交叉机的中间。 旋前抓住手柄（手掌朝下），向前迈出一步，双脚分开与肩同宽。 稍微弯曲膝盖，腰部前倾，保持背部挺直，腹部收紧。 双臂向两侧伸展，肘部稍微弯曲，呼气并将肩胛骨挤压在一起，同时以反向飞翔动作向后和向上拉动绳索。 在收缩峰值时停顿片刻，然后吸气，慢慢回到起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0154-aqvSOQE.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- band alternating biceps curl [band]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'band alternating biceps curl', NULL,
  'Resistance Training', '抗阻训练',
  'band', '弹力带',
  'biceps', '肱二头肌',
  'Stand with your feet shoulder-width apart and hold the band with an underhand grip, palms facing up. Keep your elbows close to your sides and slowly curl one arm up towards your shoulder, squeezing your biceps at the top. Lower the arm back down to the starting position and repeat with the other arm. Continue alternating arms for the desired number of repetitions.', '双脚分开与肩同宽站立，反手握住弹力带，手掌朝上。 保持肘部靠近身体两侧，慢慢地将一只手臂向肩膀弯曲，在顶部挤压二头肌。 将手臂放回起始位置，然后用另一只手臂重复此动作。 继续交替手臂进行所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0968-3omWx6P.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- band alternating v-up [band]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'band alternating v-up', NULL,
  'Core Training', '核心训练',
  'band', '弹力带',
  'abs', '腹肌',
  'Lie flat on your back with your legs straight and your arms extended overhead, holding the band. Engage your abs and lift your legs and upper body off the ground simultaneously, reaching your hands towards your toes. As you lower your legs and upper body back down, switch the position of your legs, crossing one over the other. Repeat the movement, alternating the position of your legs with each repetition. Continue for the desired number of repetitions.', '平躺，双腿伸直，手臂伸过头顶，握住弹力带。 收紧腹肌，同时将双腿和上半身抬离地面，将双手伸向脚趾。 当你降低双腿和上半身时，交换双腿的位置，将一条腿交叉在另一条腿上。 重复该动作，每次重复时交替变换双腿的位置。 继续进行所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0969-ztAa1RK.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- band assisted pull-up [band]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'band assisted pull-up', NULL,
  'Strength Training', '力量训练',
  'band', '弹力带',
  'lats', '背阔肌',
  'Attach the band to a pull-up bar or sturdy anchor point. Step onto the band and grip the bar with your palms facing away from you, hands slightly wider than shoulder-width apart. Hang with your arms fully extended, keeping your core engaged and your shoulders down and back. Pull your body up towards the bar by squeezing your shoulder blades together and driving your elbows down towards your hips. Continue pulling until your chin is above the bar, then slowly lower yourself back down to the starting position. Repeat for the desired number of repetitions.', '将弹力带固定在上拉杆或坚固的锚点上。 踏上弹力带，手掌背向自己，握住杠铃，双手之间的距离略宽于肩宽。 双臂完全伸展，保持核心收紧，肩膀向下并向后倾斜。 将肩胛骨挤压在一起并将肘部向下推向臀部，将身体向上拉向杠铃杆。 继续拉，直到下巴高于杠铃，然后慢慢降低回到起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0970-r1XNRYB.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- band assisted wheel rollerout [band]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'band assisted wheel rollerout', NULL,
  'Core Training', '核心训练',
  'band', '弹力带',
  'abs', '腹肌',
  'Kneel on the floor and hold the handles of the band with both hands, palms facing down. Place the band on the ground in front of you and position your hands shoulder-width apart. Engage your core and slowly roll the wheel forward, extending your body as far as you can while maintaining control. Pause for a moment at the furthest point, then slowly roll the wheel back towards your knees to return to the starting position. Repeat for the desired number of repetitions.', '跪在地板上，双手握住弹力带的手柄，手掌朝下。 将弹力带放在您面前的地面上，双手分开与肩同宽。 启动你的核心并缓慢地向前滚动轮子，在保持控制的同时尽可能地伸展你的身体。 在最远点暂停片刻，然后慢慢地将轮子向膝盖方向滚动，回到起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0971-zhF9lW4.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- band bench press [band]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'band bench press', NULL,
  'Strength Training', '力量训练',
  'band', '弹力带',
  'pectorals', '胸肌',
  'Lie flat on a bench with your feet flat on the ground and your back pressed against the bench. Grasp the band handles with an overhand grip, slightly wider than shoulder-width apart. Extend your arms fully, pushing the bands away from your chest. Slowly lower the bands back down to your chest, keeping your elbows at a 90-degree angle. Repeat for the desired number of repetitions.', '平躺在长凳上，双脚平放在地上，背部紧贴长凳。 正手握住带子手柄，间距略宽于肩宽。 充分伸展双臂，将弹力带推离胸部。 慢慢将弹力带放回到胸部，保持肘部呈 90 度角。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/1254-khlHMqs.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- band bent-over hip extension [band]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'band bent-over hip extension', NULL,
  'Strength Training', '力量训练',
  'band', '弹力带',
  'glutes', '臀肌',
  'Attach the band to a sturdy anchor point at ankle height. Stand facing away from the anchor point with your feet shoulder-width apart. Step back to create tension in the band, keeping your knees slightly bent. Hinge at the hips and lean forward, maintaining a neutral spine. Extend your right leg straight back, squeezing your glutes at the top. Lower your right leg back down and repeat with the left leg. Continue alternating legs for the desired number of repetitions.', '将带子固定在脚踝高度的坚固锚点上。 背对锚点站立，双脚与肩同宽。 向后退一步，在弹力带上产生张力，保持膝盖稍微弯曲。 铰接臀部并向前倾斜，保持脊柱中立。 将右腿向后伸直，在顶部挤压臀部。 将右腿放回原位，然后换左腿重复此动作。 继续交替双腿达到所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0980-wSScovH.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- band bicycle crunch [band]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'band bicycle crunch', NULL,
  'Core Training', '核心训练',
  'band', '弹力带',
  'abs', '腹肌',
  'Lie flat on your back with your hands behind your head and your knees bent. Lift your feet off the ground and bring your right knee towards your chest while simultaneously twisting your torso to bring your left elbow towards your right knee. Straighten your right leg while bringing your left knee towards your chest and twisting your torso to bring your right elbow towards your left knee. Continue alternating the twisting motion, as if you are pedaling a bicycle, while keeping your core engaged throughout the movement. Repeat for the desired number of repetitions.', '平躺，双手放在脑后，膝盖弯曲。 将脚抬离地面，将右膝盖靠近胸部，同时扭转躯干，将左肘靠近右膝盖。 伸直右腿，同时将左膝靠近胸部，并扭转躯干，使右肘靠近左膝。 继续交替扭转运动，就像踩自行车一样，同时在整个运动过程中保持核心参与。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0972-tZkGYZ9.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- band close-grip pulldown [band]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'band close-grip pulldown', NULL,
  'Strength Training', '力量训练',
  'band', '弹力带',
  'lats', '背阔肌',
  'Attach the band to a high anchor point, such as a pull-up bar or sturdy beam. Stand facing the anchor point and grab the band with an underhand grip, hands shoulder-width apart. Step back to create tension in the band, keeping your feet hip-width apart. Engage your core and keep your back straight as you pull the band down towards your chest, squeezing your shoulder blades together. Pause for a moment at the bottom of the movement, then slowly release the band back to the starting position. Repeat for the desired number of repetitions.', '将弹力带固定在较高的锚点上，例如上拉杆或坚固的横梁。 面向锚点站立，用反手抓住弹力带，双手与肩同宽。 后退一步，在弹力带上产生张力，双脚分开与臀部同宽。 当你将弹力带向下拉向胸部时，收紧你的核心并保持背部挺直，将肩胛骨挤压在一起。 在动作底部暂停片刻，然后慢慢松开弹力带回到起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0974-DptumMx.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- band close-grip push-up [band]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'band close-grip push-up', NULL,
  'Resistance Training', '抗阻训练',
  'band', '弹力带',
  'triceps', '肱三头肌',
  'Place a band around your upper arms, just above the elbows. Assume a push-up position with your hands directly under your shoulders and your body in a straight line from head to heels. Bend your elbows and lower your chest towards the ground, keeping your elbows close to your sides. Push through your palms to extend your arms and return to the starting position. Repeat for the desired number of repetitions.', '将一条带子绕在你的上臂上，就在肘部上方。 采取俯卧撑姿势，双手直接放在肩膀下方，身体从头到脚跟呈一条直线。 弯曲肘部，将胸部降低到地面，保持肘部靠近身体两侧。 推动手掌以伸展手臂并返回到起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0975-ufaxB52.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- band concentration curl [band]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'band concentration curl', NULL,
  'Resistance Training', '抗阻训练',
  'band', '弹力带',
  'biceps', '肱二头肌',
  'Sit on a bench or chair with your legs spread apart and your feet flat on the ground. Hold one end of the band in your hand and step on the other end with your foot on the same side. Lean forward slightly and rest your elbow on the inside of your thigh, just above the knee. With your palm facing up, slowly curl your hand towards your shoulder, keeping your upper arm stationary. Pause for a moment at the top, then slowly lower your hand back down to the starting position. Repeat for the desired number of repetitions, then switch sides.', '坐在长凳或椅子上，双腿分开，双脚平放在地上。 用手握住带子的一端，用脚踩在另一端上，同时将脚放在同一侧。 稍微向前倾，将肘部放在大腿内侧，膝盖上方。 手掌朝上，慢慢地将手向肩膀弯曲，保持上臂静止。 在顶部暂停片刻，然后慢慢将手放回起始位置。 重复所需的重复次数，然后换边。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0976-kmVVAfu.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- kettlebell swing [kettlebell]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'kettlebell swing', NULL,
  'Strength Training', '力量训练',
  'kettlebell', '壶铃',
  'glutes', '臀肌',
  'Stand with your feet shoulder-width apart, toes pointed slightly outward. Hold the kettlebell with both hands in front of your body, arms extended. Bend your knees slightly and hinge at the hips, pushing your butt back. Swing the kettlebell back between your legs, keeping your arms straight and maintaining a flat back. Drive your hips forward and swing the kettlebell up to shoulder height, using the momentum generated by your hips. Allow the kettlebell to swing back down between your legs and repeat the movement for the desired number of repetitions.', '双脚分开与肩同宽站立，脚趾稍微向外。 双手握住壶铃放在身体前方，双臂伸展。 稍微弯曲膝盖并铰接臀部，将臀部向后推。 将壶铃在两腿之间向后摆动，保持手臂伸直并保持背部平坦。 利用臀部产生的动量，向前推动臀部并将壶铃摆动到肩膀高度。 让壶铃在双腿之间向下摆动，然后重复该动作达到所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0549-UHJlbu3.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- kettlebell goblet squat [kettlebell]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'kettlebell goblet squat', NULL,
  'Strength Training', '力量训练',
  'kettlebell', '壶铃',
  'glutes', '臀肌',
  'Stand with your feet shoulder-width apart, holding a kettlebell close to your chest with both hands. Keeping your chest up and core engaged, lower your body down into a squat position by bending at the knees and hips. Continue lowering until your thighs are parallel to the ground, or as low as you can comfortably go. Pause for a moment at the bottom, then push through your heels to return to the starting position. Repeat for the desired number of repetitions.', '双脚分开与肩同宽站立，双手握住壶铃靠近胸部。 保持胸部挺直，核心收紧，弯曲膝盖和臀部，将身体降低至蹲姿。 继续降低，直到大腿与地面平行，或者尽可能低。 在底部停顿片刻，然后推动脚后跟回到起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0534-ZA8b5hc.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- kettlebell windmill [kettlebell]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'kettlebell windmill', NULL,
  'Core Training', '核心训练',
  'kettlebell', '壶铃',
  'abs', '腹肌',
  'Stand with your feet shoulder-width apart, holding a kettlebell in your right hand overhead. Rotate your left foot outwards about 45 degrees and keep your right foot pointing forward. Bend your torso to the left side, keeping your right arm extended overhead and your eyes on the kettlebell. Lower your torso as far as you can while keeping your right arm straight and your left arm extended to the side. Pause for a moment, then return to the starting position by pushing through your right foot and engaging your obliques. Repeat for the desired number of repetitions, then switch sides.', '双脚分开与肩同宽站立，右手握住壶铃举过头顶。 将左脚向外旋转约 45 度，并保持右脚指向前方。 将你的躯干向左侧弯曲，保持右臂伸过头顶，眼睛盯着壶铃。 尽可能降低躯干，同时保持右臂伸直，左臂向一侧伸展。 暂停片刻，然后通过推动右脚并接合斜肌返回到起始位置。 重复所需的重复次数，然后换边。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0554-9Tkqa9O.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- kettlebell advanced windmill [kettlebell]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'kettlebell advanced windmill', NULL,
  'Core Training', '核心训练',
  'kettlebell', '壶铃',
  'abs', '腹肌',
  'Stand with your feet wider than shoulder-width apart, toes pointing slightly outward. Hold a kettlebell in your right hand, with your arm extended overhead and your palm facing forward. Rotate your left foot slightly to the right, and shift your weight onto your left leg. Bend your left knee and hinge at the hip, lowering your torso towards the left side. Keep your right arm extended overhead and your eyes on the kettlebell. As you lower your torso, allow your right leg to straighten and your right foot to pivot slightly. Lower your torso until you feel a stretch in your left hamstring and your right arm is pointing towards the ground. Pause for a moment, then engage your core and push through your left heel to return to the starting position. Repeat for the desired number of repetitions, then switch sides.', '站立，双脚分开比肩宽，脚趾稍微向外。 右手握住壶铃，手臂伸过头顶，手掌朝前。 将左脚稍微向右旋转，并将重量转移到左腿上。 弯曲左膝并铰接在臀部，将躯干向左侧降低。 保持右臂伸过头顶，眼睛盯着壶铃。 当你降低躯干时，让右腿伸直，右脚稍微转动。 降低躯干，直到感觉到左腿筋拉伸并且右臂指向地面。 暂停片刻，然后启动核心并推动左脚跟返回到起始位置。 重复所需的重复次数，然后换边。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0517-Kal9cQQ.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- kettlebell alternating hang clean [kettlebell]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'kettlebell alternating hang clean', NULL,
  'Resistance Training', '抗阻训练',
  'kettlebell', '壶铃',
  'forearms', '前臂',
  'Stand with your feet shoulder-width apart, holding a kettlebell in each hand with an overhand grip. Bend your knees slightly and hinge forward at the hips, keeping your back straight and chest up. Allow the kettlebells to hang in front of your body with your arms fully extended. In one fluid motion, explosively extend your hips, shrug your shoulders, and pull the kettlebells up towards your shoulders. As the kettlebells reach shoulder height, rotate your wrists and catch the kettlebells in the rack position, with your palms facing inward and the kettlebells resting on the outside of your forearms. Lower the kettlebells back down to the starting position and repeat the movement with the opposite arm. Continue alternating arms for the desired number of repetitions.', '双脚分开与肩同宽站立，双手各握一个壶铃，正手握住。 稍微弯曲膝盖，臀部向前转动，保持背部挺直，挺胸。 让壶铃悬挂在身体前方，双臂完全伸展。 以一种流畅的动作，爆发性地伸展臀部，耸肩，并将壶铃拉向肩膀。 当壶铃到达肩膀高度时，旋转手腕并将壶铃抓住在架子位置，手掌朝内，壶铃放在前臂外侧。 将壶铃放回起始位置，然后用另一只手臂重复该动作。 继续交替手臂进行所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0518-I4tibZG.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- kettlebell alternating press [kettlebell]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'kettlebell alternating press', NULL,
  'Resistance Training', '抗阻训练',
  'kettlebell', '壶铃',
  'delts', '三角肌',
  'Stand with your feet shoulder-width apart, holding a kettlebell in each hand at shoulder height. Press one kettlebell overhead, fully extending your arm. Lower the kettlebell back to shoulder height. Repeat with the other arm. Continue alternating arms for the desired number of repetitions.', '双脚分开与肩同宽站立，双手各握一个壶铃，与肩同高。 将一只壶铃按过头顶，完全伸展手臂。 将壶铃降低至肩膀高度。 用另一只手臂重复上述步骤。 继续交替手臂进行所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0520-5KLbZWx.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- kettlebell alternating press on floor [kettlebell]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'kettlebell alternating press on floor', NULL,
  'Strength Training', '力量训练',
  'kettlebell', '壶铃',
  'pectorals', '胸肌',
  'Start by lying on your back on the floor with your knees bent and feet flat on the ground. Hold a kettlebell in each hand, with your palms facing towards your feet and your arms extended straight up towards the ceiling. Lower one kettlebell down towards your shoulder while keeping the other kettlebell extended straight up. Press the lowered kettlebell back up to the starting position while simultaneously lowering the other kettlebell down towards your shoulder. Continue alternating the press motion with each kettlebell for the desired number of repetitions.', '首先仰卧在地板上，膝盖弯曲，双脚平放在地面上。 每只手握住一个壶铃，手掌朝向脚部，手臂伸直向天花板。 将一个壶铃向肩膀方向降低，同时保持另一个壶铃向上伸直。 将降低的壶铃按回到起始位置，同时将另一个壶铃向肩膀方向降低。 继续用每个壶铃交替进行推举动作，达到所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0519-7w6i0vE.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- kettlebell alternating renegade row [kettlebell]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'kettlebell alternating renegade row', NULL,
  'Strength Training', '力量训练',
  'kettlebell', '壶铃',
  'upper back', '上背部',
  'Start in a high plank position with your hands gripping the kettlebells and your feet hip-width apart. Engage your core and keep your body in a straight line from head to heels. Pull one kettlebell up towards your chest, keeping your elbow close to your body. Lower the kettlebell back down to the starting position and repeat with the other arm. Continue alternating arms for the desired number of repetitions.', '从高平板支撑位置开始，双手握住壶铃，双脚分开与臀部同宽。 收紧核心肌群，保持身体从头到脚跟呈一条直线。 将一个壶铃向上拉向胸部，保持肘部靠近身体。 将壶铃放回起始位置，然后用另一只手臂重复该动作。 继续交替手臂进行所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0521-b9kqlBy.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- kettlebell alternating row [kettlebell]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'kettlebell alternating row', NULL,
  'Strength Training', '力量训练',
  'kettlebell', '壶铃',
  'upper back', '上背部',
  'Stand with your feet shoulder-width apart, knees slightly bent, and hold a kettlebell in each hand with your palms facing your body. Bend forward at the hips, keeping your back straight and your core engaged. Pull one kettlebell up towards your chest, keeping your elbow close to your body and squeezing your shoulder blades together. Lower the kettlebell back down to the starting position and repeat with the other arm. Continue alternating arms for the desired number of repetitions.', '双脚分开与肩同宽站立，膝盖稍微弯曲，双手各握一个壶铃，手掌朝向身体。 臀部向前弯曲，保持背部挺直，核心肌群参与。 将一个壶铃向上拉向胸部，保持肘部靠近身体并将肩胛骨挤压在一起。 将壶铃放回起始位置，然后用另一只手臂重复该动作。 继续交替手臂进行所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0522-Ca76jUE.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- kettlebell arnold press [kettlebell]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'kettlebell arnold press', NULL,
  'Resistance Training', '抗阻训练',
  'kettlebell', '壶铃',
  'delts', '三角肌',
  'Stand with your feet shoulder-width apart, holding a kettlebell in each hand at shoulder height with your palms facing towards you. Engage your core and press the kettlebells overhead, rotating your palms to face forward as you extend your arms. Pause at the top of the movement, then slowly lower the kettlebells back to the starting position. Repeat for the desired number of repetitions.', '双脚分开与肩同宽站立，双手各握一个壶铃，与肩同高，手掌朝向自己。 启动你的核心并将壶铃压过头顶，在伸展手臂时旋转手掌以面向前方。 在动作的最高点暂停，然后慢慢将壶铃放回起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0523-UM8mgyG.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- smith back shrug [smith machine]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'smith back shrug', NULL,
  'Strength Training', '力量训练',
  'smith machine', '史密斯架',
  'traps', '斜方肌',
  'Stand with your feet shoulder-width apart and your knees slightly bent. Grasp the barbell with an overhand grip, hands slightly wider than shoulder-width apart. Keep your arms straight and allow the barbell to hang in front of your thighs. Lift your shoulders straight up towards your ears, squeezing your traps at the top. Hold for a moment, then lower your shoulders back down to the starting position. Repeat for the desired number of repetitions.', '双脚分开与肩同宽站立，膝盖稍微弯曲。 正手握住杠铃，双手间距略宽于肩宽。 保持手臂伸直，让杠铃挂在大腿前面。 将肩膀向耳朵方向伸直，挤压斜方肌顶部。 保持一会儿，然后将肩膀放回起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0746-MzNnwx9.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- smith behind neck press [smith machine]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'smith behind neck press', NULL,
  'Resistance Training', '抗阻训练',
  'smith machine', '史密斯架',
  'delts', '三角肌',
  'Adjust the seat height of the smith machine so that the bar is at shoulder level. Stand with your feet shoulder-width apart and your knees slightly bent. Grasp the bar with an overhand grip, slightly wider than shoulder-width apart. Lift the bar off the rack and step back, maintaining a stable stance. Lower the bar down to the back of your neck, keeping your elbows pointing forward. Press the bar up overhead until your arms are fully extended. Pause for a moment at the top, then slowly lower the bar back down to the starting position. Repeat for the desired number of repetitions.', '调整史密斯机的座椅高度，使杠铃与肩部齐平。 双脚分开与肩同宽站立，膝盖稍微弯曲。 正手握住杠铃，握距略宽于肩宽。 将杠铃从架子上抬起并向后退一步，保持稳定的姿势。 将杠铃降低到颈后，保持肘部向前。 将杠铃向上推过头顶，直到双臂完全伸展。 在顶部暂停片刻，然后慢慢将杠铃放回起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0747-Gpn4ADc.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- smith bench press [smith machine]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'smith bench press', NULL,
  'Strength Training', '力量训练',
  'smith machine', '史密斯架',
  'pectorals', '胸肌',
  'Adjust the height of the smith machine bar to chest level. Lie flat on the bench with your feet firmly planted on the ground. Grip the bar with an overhand grip slightly wider than shoulder-width apart. Unrack the bar and lower it towards your chest, keeping your elbows tucked in. Pause for a moment when the bar touches your chest. Push the bar back up to the starting position, fully extending your arms. Repeat for the desired number of repetitions.', '将史密斯机杆的高度调整至胸部水平。 平躺在长凳上，双脚牢牢踩在地上。 正手握住杠铃，握距略宽于肩宽。 松开杠铃并将其向胸部降低，保持肘部内收。 当杠铃接触到你的胸部时暂停片刻。 将杠铃推回到起始位置，完全伸展双臂。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0748-trqKQv2.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- smith bent knee good morning [smith machine]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'smith bent knee good morning', NULL,
  'Strength Training', '力量训练',
  'smith machine', '史密斯架',
  'glutes', '臀肌',
  'Start by standing with your feet shoulder-width apart, toes pointing forward. Place the barbell across your upper back, resting it on your traps. Bend your knees slightly and hinge forward at the hips, keeping your back straight. Lower your torso until it is parallel to the ground, feeling a stretch in your hamstrings. Engage your glutes and hamstrings to raise your torso back up to the starting position. Repeat for the desired number of repetitions.', '首先站立，双脚分开与肩同宽，脚趾指向前方。 将杠铃放在上背部，放在斜方肌上。 稍微弯曲膝盖，髋部向前转动，保持背部挺直。 降低躯干直到与地面平行，感觉腿筋被拉伸。 启动臀肌和腿筋，将躯干抬回到起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0749-1bQkKZK.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- smith bent over row [smith machine]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'smith bent over row', NULL,
  'Strength Training', '力量训练',
  'smith machine', '史密斯架',
  'upper back', '上背部',
  'Set up the smith machine with the bar at hip height. Stand facing the bar with your feet shoulder-width apart. Bend your knees slightly and hinge forward at the hips, keeping your back straight. Grasp the bar with an overhand grip, hands slightly wider than shoulder-width apart. Pull the bar towards your lower chest, squeezing your shoulder blades together. Pause for a moment at the top, then slowly lower the bar back down to the starting position. Repeat for the desired number of repetitions.', '将史密斯机设置为与臀部高度相同的杠铃。 面向杠铃站立，双脚分开与肩同宽。 稍微弯曲膝盖，髋部向前转动，保持背部挺直。 正手握住杠铃，双手距离略宽于肩宽。 将杠铃拉向下胸部，将肩胛骨挤压在一起。 在顶部暂停片刻，然后慢慢将杠铃放回起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/1359-ZX9UZmj.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- smith chair squat [smith machine]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'smith chair squat', NULL,
  'Strength Training', '力量训练',
  'smith machine', '史密斯架',
  'quads', '股四头肌',
  'Adjust the height of the smith machine bar to a comfortable position. Stand with your feet shoulder-width apart, toes slightly turned out. Place the barbell across your upper back, resting it on your traps. Engage your core and keep your chest up as you slowly lower your body by bending your knees and hips. Continue lowering until your thighs are parallel to the ground, or as low as you can comfortably go. Pause for a moment, then push through your heels to return to the starting position. Repeat for the desired number of repetitions.', '将史密斯机杆的高度调整到舒适的位置。 站立，双脚分开与肩同宽，脚趾稍微向外。 将杠铃放在上背部，放在斜方肌上。 通过弯曲膝盖和臀部慢慢降低身体，收紧核心并保持挺胸。 继续降低，直到大腿与地面平行，或者尽可能低。 暂停片刻，然后用力推动脚后跟，回到起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0750-Gu2rNJd.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- smith close-grip bench press [smith machine]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'smith close-grip bench press', NULL,
  'Resistance Training', '抗阻训练',
  'smith machine', '史密斯架',
  'triceps', '肱三头肌',
  'Adjust the seat height and position yourself on the bench with your feet flat on the ground. Grasp the barbell with a close grip, slightly narrower than shoulder-width apart. Lower the barbell towards your chest, keeping your elbows close to your body. Pause for a moment at the bottom, then push the barbell back up to the starting position. Repeat for the desired number of repetitions.', '调整座椅高度，将自己放在长凳上，双脚平放在地面上。 紧紧握住杠铃，握距略窄于肩宽。 将杠铃向胸部降低，保持肘部靠近身体。 在底部停顿片刻，然后将杠铃推回到起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0751-WcHl7ru.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- smith deadlift [smith machine]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'smith deadlift', NULL,
  'Strength Training', '力量训练',
  'smith machine', '史密斯架',
  'glutes', '臀肌',
  'Set up the smith machine with the bar at hip height. Stand with your feet shoulder-width apart, toes pointing slightly outward. Bend at the hips and knees, keeping your back straight and chest up, and grip the bar with an overhand grip slightly wider than shoulder-width apart. Engage your core and lift the bar by extending your hips and knees, keeping the bar close to your body. Stand up straight, fully extending your hips and knees. Lower the bar back down by bending at the hips and knees, maintaining control and keeping your back straight. Repeat for the desired number of repetitions.', '将史密斯机设置为与臀部高度相同的杠铃。 双脚分开与肩同宽站立，脚趾稍微向外。 弯曲臀部和膝盖，保持背部挺直，挺胸，正手握住杠铃，握距略宽于肩宽。 伸展臀部和膝盖，调动核心力量并举起杠铃，保持杠铃靠近身体。 站直，充分伸展臀部和膝盖。 通过弯曲臀部和膝盖来降低杠铃，保持控制并保持背部挺直。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0752-UfePqpx.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- assisted chest dip (kneeling) [leverage machine]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'assisted chest dip (kneeling)', NULL,
  'Strength Training', '力量训练',
  'leverage machine', '器械',
  'pectorals', '胸肌',
  'Adjust the machine to your desired height and secure your knees on the pad. Grasp the handles with your palms facing down and your arms fully extended. Lower your body by bending your elbows until your upper arms are parallel to the floor. Pause for a moment, then push yourself back up to the starting position. Repeat for the desired number of repetitions.', '将机器调整到您想要的高度，并将膝盖固定在垫子上。 手掌朝下，抓住手柄，双臂完全伸展。 弯曲肘部降低身体，直到上臂与地板平行。 暂停片刻，然后将自己推回到起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0009-PAgTVaK.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- assisted parallel close grip pull-up [leverage machine]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'assisted parallel close grip pull-up', NULL,
  'Strength Training', '力量训练',
  'leverage machine', '器械',
  'lats', '背阔肌',
  'Adjust the machine to your desired weight and height. Place your hands on the parallel bars with a close grip, palms facing each other. Hang from the bars with your arms fully extended and your feet off the ground. Engage your back muscles and pull your body up towards the bars, keeping your elbows close to your body. Continue pulling until your chin is above the bars. Pause for a moment at the top, then slowly lower your body back down to the starting position. Repeat for the desired number of repetitions.', '将机器调整到您想要的重量和高度。 将双手紧紧握在双杠上，手掌相对。 悬挂在杠上，双臂完全伸展，双脚离开地面。 收紧背部肌肉，将身体拉向杠铃，保持肘部靠近身体。 继续拉，直到下巴高于杠铃。 在顶部停顿片刻，然后慢慢将身体放回起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0015-vrhHa6D.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- assisted pull-up [leverage machine]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'assisted pull-up', NULL,
  'Strength Training', '力量训练',
  'leverage machine', '器械',
  'lats', '背阔肌',
  'Adjust the machine to your desired weight and height settings. Grasp the handles with an overhand grip, slightly wider than shoulder-width apart. Hang with your arms fully extended and your feet off the ground. Engage your back muscles and pull your body up towards the handles, keeping your elbows close to your body. Continue pulling until your chin is above the handles. Pause for a moment at the top, then slowly lower your body back down to the starting position. Repeat for the desired number of repetitions.', '将机器调整至您所需的体重和高度设置。 正手握住手柄，握距略宽于肩宽。 双臂完全伸展，双脚离开地面。 收紧背部肌肉，将身体拉向手柄，保持肘部靠近身体。 继续拉，直到下巴位于手柄上方。 在顶部停顿片刻，然后慢慢将身体放回起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0017-kiJ4Z2K.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- assisted standing chin-up [leverage machine]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'assisted standing chin-up', NULL,
  'Strength Training', '力量训练',
  'leverage machine', '器械',
  'lats', '背阔肌',
  'Adjust the machine to your desired assistance level. Stand on the foot platform and grip the handles with an overhand grip, slightly wider than shoulder-width apart. Keep your chest up and shoulders back, engage your core, and slightly bend your knees. Pull your body up by flexing your elbows and driving your elbows down towards your sides. Continue pulling until your chin is above the bar. Pause for a moment at the top, then slowly lower your body back down to the starting position. Repeat for the desired number of repetitions.', '将机器调整至您所需的辅助级别。 站在脚踏板上，正手握住手柄，握距略宽于肩宽。 保持挺胸、肩膀向后，收紧核心肌群，并稍微弯曲膝盖。 弯曲肘部并将肘部向身体两侧压低，将身体向上拉。 继续拉，直到下巴位于杠铃上方。 在顶部停顿片刻，然后慢慢将身体放回起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/1431-7OeHptV.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- assisted standing pull-up [leverage machine]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'assisted standing pull-up', NULL,
  'Strength Training', '力量训练',
  'leverage machine', '器械',
  'lats', '背阔肌',
  'Adjust the machine to your desired weight and height settings. Stand facing the machine with your feet shoulder-width apart. Grasp the handles with an overhand grip, slightly wider than shoulder-width apart. Engage your lats and biceps, and pull yourself up towards the handles. Pause for a moment at the top, squeezing your back muscles. Slowly lower yourself back down to the starting position. Repeat for the desired number of repetitions.', '将机器调整至您所需的体重和高度设置。 面向机器站立，双脚分开与肩同宽。 正手握住手柄，握距略宽于肩宽。 启动你的背阔肌和二头肌，并将自己拉向手柄。 在顶部暂停片刻，挤压背部肌肉。 慢慢地将自己放回到起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/1432-f4xtKBj.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- assisted triceps dip (kneeling) [leverage machine]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'assisted triceps dip (kneeling)', NULL,
  'Resistance Training', '抗阻训练',
  'leverage machine', '器械',
  'triceps', '肱三头肌',
  'Adjust the machine to your desired weight and height. Kneel down on the pad facing the machine, with your hands gripping the handles. Lower your body by bending your elbows, keeping your back straight and close to the machine. Pause for a moment at the bottom, then push yourself back up to the starting position. Repeat for the desired number of repetitions.', '将机器调整到您想要的重量和高度。 跪在面向机器的垫子上，双手握住手柄。 弯曲肘部降低身体，保持背部挺直并靠近机器。 在底部暂停片刻，然后将自己推回到起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0019-J60bN17.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- back extension on exercise ball [stability ball]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'back extension on exercise ball', NULL,
  'Strength Training', '力量训练',
  'stability ball', '瑞士球',
  'spine', '脊柱',
  'Place the stability ball on the ground and lie face down on top of it, with your hips resting on the ball and your feet against a wall or other stable surface. Position your hands behind your head or crossed over your chest. Engage your core and slowly lift your upper body off the ball, extending your back until your body forms a straight line from your head to your heels. Pause for a moment at the top, then slowly lower your upper body back down to the starting position. Repeat for the desired number of repetitions.', '将稳定球放在地面上，面朝下躺在上面，臀部放在球上，双脚靠在墙壁或其他稳定的表面上。 将双手放在脑后或交叉在胸前。 启动你的核心，慢慢地将你的上半身抬离球，伸展你的背部，直到你的身体从头部到脚后跟形成一条直线。 在顶部停顿片刻，然后慢慢将上半身放回起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/1314-qLpO4vV.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- chest stretch with exercise ball [stability ball]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'chest stretch with exercise ball', NULL,
  'Strength Training', '力量训练',
  'stability ball', '瑞士球',
  'pectorals', '胸肌',
  'Sit on the stability ball with your feet flat on the ground and your back straight. Hold the exercise ball with both hands and extend your arms straight out in front of you. Slowly bring the exercise ball towards your chest, feeling a stretch in your chest muscles. Hold the stretch for a few seconds, then slowly return to the starting position. Repeat for the desired number of repetitions.', '坐在稳定球上，双脚平放在地面上，背部挺直。 双手握住健身球，并将双臂伸直至身前。 慢慢地将健身球移向胸部，感受胸部肌肉的拉伸。 保持伸展几秒钟，然后慢慢回到起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/1272-ykA5tU7.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- crunch (on stability ball, arms straight) [stability ball]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'crunch (on stability ball, arms straight)', NULL,
  'Core Training', '核心训练',
  'stability ball', '瑞士球',
  'abs', '腹肌',
  'Sit on the stability ball with your feet flat on the ground and your knees bent at a 90-degree angle. Lie back on the ball until your lower back is supported and your upper body is parallel to the floor. Place your hands behind your head or cross them over your chest. Engage your abs and lift your upper body off the ball, curling your shoulders towards your hips. Pause for a moment at the top, then slowly lower your upper body back down to the starting position. Repeat for the desired number of repetitions.', '坐在稳定球上，双脚平放在地面上，膝盖弯曲成 90 度角。 仰卧在球上，直到下背部得到支撑并且上半身与地板平行。 将双手放在脑后或交叉放在胸前。 收紧腹肌，将上半身抬离球，将肩膀向臀部弯曲。 在顶部停顿片刻，然后慢慢将上半身放回起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0272-Sn8wxAI.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- crunch (on stability ball) [stability ball]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'crunch (on stability ball)', NULL,
  'Core Training', '核心训练',
  'stability ball', '瑞士球',
  'abs', '腹肌',
  'Sit on the stability ball with your feet flat on the ground and your knees bent at a 90-degree angle. Lie back on the ball until your lower back is supported and your upper body is parallel to the floor. Place your hands behind your head or across your chest. Engage your abs and lift your upper body towards your knees, curling your torso forward. Pause for a moment at the top of the movement, then slowly lower your upper body back down to the starting position. Repeat for the desired number of repetitions.', '坐在稳定球上，双脚平放在地面上，膝盖弯曲成 90 度角。 仰卧在球上，直到下背部得到支撑并且上半身与地板平行。 将双手放在脑后或放在胸前。 收紧腹肌，将上身抬向膝盖，躯干向前卷曲。 在动作的最高点暂停片刻，然后慢慢将上半身放回起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0271-MCUhf1F.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- exercise ball alternating arm ups [stability ball]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'exercise ball alternating arm ups', NULL,
  'Strength Training', '力量训练',
  'stability ball', '瑞士球',
  'lats', '背阔肌',
  'Sit on the stability ball with your feet flat on the ground and your back straight. Hold a dumbbell in each hand with your palms facing inwards and your arms extended down by your sides. Engage your core and slowly lift one arm up towards your shoulder, keeping your elbow slightly bent. Pause for a moment at the top, then slowly lower your arm back down to the starting position. Repeat the movement with the other arm. Continue alternating arms for the desired number of repetitions.', '坐在稳定球上，双脚平放在地面上，背部挺直。 双手各握一个哑铃，手掌朝内，双臂在身体两侧向下伸展。 启动你的核心，慢慢地将一只手臂向肩膀抬起，保持肘部稍微弯曲。 在顶部暂停片刻，然后慢慢将手臂放回起始位置。 用另一只手臂重复该动作。 继续交替手臂进行所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/1332-EyLrNC2.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- ez bar french press on exercise ball [ez barbell]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'ez bar french press on exercise ball', NULL,
  'Resistance Training', '抗阻训练',
  'ez barbell', 'EZ杠',
  'triceps', '肱三头肌',
  'Sit on an exercise ball and hold an EZ barbell with an overhand grip. Extend your arms straight up, keeping your elbows close to your head. Slowly lower the barbell behind your head by bending your elbows. Pause for a moment, then extend your arms back up to the starting position. Repeat for the desired number of repetitions.', '坐在健身球上，正手握住 EZ 杠铃。 向上伸展双臂，保持肘部靠近头部。 弯曲肘部，慢慢将杠铃降低到脑后。 暂停片刻，然后将手臂伸回到起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/1747-CFN9P8G.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- ez bar lying bent arms pullover [ez barbell]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'ez bar lying bent arms pullover', NULL,
  'Strength Training', '力量训练',
  'ez barbell', 'EZ杠',
  'lats', '背阔肌',
  'Lie flat on a bench with your head at one end and your feet on the floor. Hold the EZ barbell with a pronated grip (palms facing away from you) and your hands shoulder-width apart. Extend your arms straight above your chest, keeping a slight bend in your elbows. Lower the barbell in an arc motion behind your head, maintaining the slight bend in your elbows. Pause for a moment, then return the barbell to the starting position by reversing the arc motion. Repeat for the desired number of repetitions.', '平躺在长凳上，头放在一端，双脚放在地板上。 旋前握住 EZ 杠铃（手掌背向您），双手与肩同宽。 将手臂伸直至胸部上方，保持肘部轻微弯曲。 以弧线动作将杠铃降低到头后，保持肘部轻微弯曲。 暂停片刻，然后通过反向弧线运动将杠铃返回到起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/3010-nDK1HJ0.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- ez bar lying close grip triceps extension behind head [ez barbell]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'ez bar lying close grip triceps extension behind head', NULL,
  'Resistance Training', '抗阻训练',
  'ez barbell', 'EZ杠',
  'triceps', '肱三头肌',
  'Lie flat on a bench with your feet flat on the ground and your head at the end of the bench. Hold the ez barbell with a close grip, palms facing up, and extend your arms straight up over your chest. Keeping your upper arms stationary, slowly lower the barbell behind your head by bending your elbows. Pause for a moment, then extend your arms back up to the starting position. Repeat for the desired number of repetitions.', '平躺在长凳上，双脚平放在地上，头放在长凳的末端。 紧紧握住 ez 杠铃，手掌朝上，将手臂伸直至胸部上方。 保持上臂静止，弯曲肘部，慢慢将杠铃降低到脑后。 暂停片刻，然后将手臂伸回到起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/1748-6CKUx7o.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

-- ez bar reverse grip bent over row [ez barbell]
INSERT INTO master_exercise (
  name_en, name_cn,
  type_en, type_cn,
  equipment_en, equipment_cn,
  target_muscles_en, target_muscles_cn,
  instructions_en, instructions_cn,
  featured_image_url,
  is_active, created_at
) VALUES (
  'ez bar reverse grip bent over row', NULL,
  'Strength Training', '力量训练',
  'ez barbell', 'EZ杠',
  'upper back', '上背部',
  'Stand with your feet shoulder-width apart and knees slightly bent. Hold the ez barbell with an underhand grip, palms facing up, and hands shoulder-width apart. Bend forward at the hips, keeping your back straight and chest up, until your torso is almost parallel to the floor. Pull the ez barbell towards your lower chest, squeezing your shoulder blades together. Pause for a moment at the top, then slowly lower the ez barbell back to the starting position. Repeat for the desired number of repetitions.', '站立，双脚分开与肩同宽，膝盖稍微弯曲。 反手握住 ez 杠铃，手掌朝上，双手与肩同宽。 臀部向前弯曲，保持背部挺直，挺胸，直到躯干几乎与地板平行。 将 ez 杠铃拉向下胸部，将肩胛骨挤压在一起。 在顶部暂停片刻，然后慢慢将 ez 杠铃放回起始位置。 重复所需的重复次数。',
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/1344-G8dXpNG.jpg',
  true, NOW()
) ON CONFLICT DO NOTHING;

COMMIT;

-- 共 118 条
-- name_cn / instructions_cn 为 NULL 的条目需人工补中文
-- 验证：SELECT name_en, equipment_en, type_cn FROM master_exercise
--        WHERE created_at > NOW() - INTERVAL '10 minutes' ORDER BY type_cn, name_en;
