import { Link } from 'react-router-dom';

// material-ui
import { Box, Button, Grid, Stack, Typography } from '@mui/material';

// assets
import construction from 'assets/under-construction-2.svg';
import { useTranslation } from 'react-i18next';

// ==============================|| UNDER CONSTRUCTION - MAIN ||============================== //

function UnderconstructionPage() {

  const {t} = useTranslation()

  return (
    <Grid container spacing={4} direction="column" alignItems="center" justifyContent="center" sx={{ minHeight: '90vh', py: 2 }}>
      <Grid item xs={12}>
        <Box sx={{ width: { xs: 300, sm: 480 } }}>
          <img src={construction} alt="mantis" style={{ width: '100%', height: 'auto' }} />
        </Box>
      </Grid>
      <Grid item xs={12}>
        <Stack spacing={2} justifyContent="center" alignItems="center">
          <Typography align="center" variant="h1">
            {t("underconst")}
          </Typography>
          <Typography color="textSecondary" align="center" sx={{ width: '85%' }}>
            {t("underlate")}
          </Typography>
          <Button component={Link} to={process.env.REACT_APP_URL} variant="contained">
            {t("go_home")}
          </Button>
        </Stack>
      </Grid>
    </Grid>
  );
}

export default UnderconstructionPage;


